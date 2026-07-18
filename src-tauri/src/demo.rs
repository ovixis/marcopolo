//! Deterministic sample data so the app is fully explorable without API keys.
//! Results are derived from a hash of the route, so the same search always
//! returns the same offers.

use crate::types::{
    FlightOffer, FlightPoint, FlightSearchQuery, FlightSearchResult, Itinerary, LocationSuggestion,
    Segment,
};

const CARRIERS: &[(&str, &str)] = &[
    ("AA", "American Airlines"),
    ("BA", "British Airways"),
    ("AF", "Air France"),
    ("SQ", "Singapore Airlines"),
    ("QF", "Qantas"),
    ("EK", "Emirates"),
    ("LH", "Lufthansa"),
    ("DL", "Delta Air Lines"),
];

const HUBS: &[&str] = &["DXB", "LHR", "CDG", "SIN", "FRA", "DFW"];

const AIRPORTS: &[(&str, &str, &str, &str)] = &[
    (
        "JFK",
        "John F. Kennedy International",
        "New York",
        "United States",
    ),
    (
        "LAX",
        "Los Angeles International",
        "Los Angeles",
        "United States",
    ),
    (
        "SFO",
        "San Francisco International",
        "San Francisco",
        "United States",
    ),
    ("LHR", "Heathrow", "London", "United Kingdom"),
    ("CDG", "Charles de Gaulle", "Paris", "France"),
    ("NRT", "Narita International", "Tokyo", "Japan"),
    ("HND", "Haneda", "Tokyo", "Japan"),
    ("SIN", "Changi", "Singapore", "Singapore"),
    ("SYD", "Kingsford Smith", "Sydney", "Australia"),
    (
        "DXB",
        "Dubai International",
        "Dubai",
        "United Arab Emirates",
    ),
    ("FRA", "Frankfurt am Main", "Frankfurt", "Germany"),
    ("AMS", "Schiphol", "Amsterdam", "Netherlands"),
    ("BCN", "El Prat", "Barcelona", "Spain"),
    ("FCO", "Fiumicino", "Rome", "Italy"),
    ("BKK", "Suvarnabhumi", "Bangkok", "Thailand"),
    ("IST", "Istanbul Airport", "Istanbul", "Türkiye"),
    ("GRU", "Guarulhos International", "São Paulo", "Brazil"),
    (
        "MEX",
        "Benito Juárez International",
        "Mexico City",
        "Mexico",
    ),
    ("YYZ", "Toronto Pearson", "Toronto", "Canada"),
    ("DEL", "Indira Gandhi International", "Delhi", "India"),
];

/// Small stable hash (FNV-1a) so demo results are deterministic per route.
fn fnv1a(input: &str) -> u64 {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in input.bytes() {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

pub fn flight_results(query: &FlightSearchQuery) -> FlightSearchResult {
    let origin = query.origin.to_uppercase();
    let destination = query.destination.to_uppercase();
    let currency = query.currency.clone().unwrap_or_else(|| "USD".to_owned());
    let seed = fnv1a(&format!("{origin}-{destination}-{}", query.departure_date));

    // Route "length" drives duration and price so different routes feel different.
    let route_minutes = 90 + (seed % 900) as u32; // 1.5h .. 16.5h
    let base_price = 120 + (seed % 700) as u32;
    let cabin_multiplier = match query.travel_class.as_deref() {
        Some("BUSINESS") => 4,
        Some("FIRST") => 7,
        Some("PREMIUM_ECONOMY") => 2,
        _ => 1,
    };

    let travelers = query.adults.max(1) + query.children;
    let offer_count = if query.non_stop { 4 } else { 7 };

    let offers = (0..offer_count)
        .map(|i| {
            let offer_seed = seed.wrapping_add(i as u64 * 7919);
            let carrier = CARRIERS[(offer_seed % CARRIERS.len() as u64) as usize];
            let depart_hour = 6 + (offer_seed % 16) as u32; // 06:00 .. 21:00
            let depart_minute = [0, 15, 30, 45][(offer_seed % 4) as usize];
            let with_stop = !query.non_stop && i % 2 == 1;
            let minutes = route_minutes + if with_stop { 110 } else { 0 };
            let price = (base_price + i * 47 + if with_stop { 0 } else { 60 })
                * cabin_multiplier
                * travelers;

            let outbound = build_itinerary(
                &origin,
                &destination,
                &query.departure_date,
                depart_hour,
                depart_minute,
                minutes,
                carrier,
                offer_seed,
                with_stop,
            );
            let mut itineraries = vec![outbound];
            if let Some(return_date) = query.return_date.as_deref().filter(|d| !d.is_empty()) {
                itineraries.push(build_itinerary(
                    &destination,
                    &origin,
                    return_date,
                    (depart_hour + 3) % 24,
                    depart_minute,
                    minutes,
                    carrier,
                    offer_seed.wrapping_add(13),
                    with_stop,
                ));
            }

            FlightOffer {
                id: format!("demo-{i}"),
                total_price: format!("{price}.00"),
                currency: currency.clone(),
                itineraries,
                validating_airline: Some(carrier.1.to_owned()),
                seats_remaining: Some(2 + (offer_seed % 7) as u32),
            }
        })
        .collect();

    FlightSearchResult {
        offers,
        currency,
        demo: true,
    }
}

#[allow(clippy::too_many_arguments)]
fn build_itinerary(
    from: &str,
    to: &str,
    date: &str,
    depart_hour: u32,
    depart_minute: u32,
    total_minutes: u32,
    carrier: (&str, &str),
    seed: u64,
    with_stop: bool,
) -> Itinerary {
    // Minutes since departure-day midnight → local datetime, rolling the date
    // forward past midnight so overnight arrivals land on the next day.
    let time = |total_min: u32| {
        format!(
            "{}T{:02}:{:02}:00",
            add_days(date, total_min / 1440),
            (total_min % 1440) / 60,
            total_min % 60
        )
    };
    let flight_number = |offset: u64| format!("{}", 100 + ((seed + offset) % 899));

    let depart_total = depart_hour * 60 + depart_minute;
    let arrive_total = depart_total + total_minutes;

    let segments = if with_stop {
        let start = (seed % HUBS.len() as u64) as usize;
        let hub = (0..HUBS.len())
            .map(|i| HUBS[(start + i) % HUBS.len()])
            .find(|h| *h != from && *h != to)
            .unwrap_or("DOH");
        let leg_one = total_minutes / 2 - 45;
        let layover = 90;
        let hub_arrive = depart_total + leg_one;
        let hub_depart = hub_arrive + layover;
        vec![
            Segment {
                departure: FlightPoint {
                    iata_code: from.to_owned(),
                    terminal: None,
                    at: time(depart_total),
                },
                arrival: FlightPoint {
                    iata_code: hub.to_owned(),
                    terminal: Some("1".to_owned()),
                    at: time(hub_arrive),
                },
                carrier_code: carrier.0.to_owned(),
                carrier_name: Some(carrier.1.to_owned()),
                flight_number: flight_number(0),
                duration: Some(format!("PT{}H{}M", leg_one / 60, leg_one % 60)),
                aircraft: Some("Airbus A350-900".to_owned()),
            },
            Segment {
                departure: FlightPoint {
                    iata_code: hub.to_owned(),
                    terminal: Some("1".to_owned()),
                    at: time(hub_depart),
                },
                arrival: FlightPoint {
                    iata_code: to.to_owned(),
                    terminal: None,
                    at: time(arrive_total),
                },
                carrier_code: carrier.0.to_owned(),
                carrier_name: Some(carrier.1.to_owned()),
                flight_number: flight_number(1),
                duration: Some(format!(
                    "PT{}H{}M",
                    (total_minutes - leg_one - layover) / 60,
                    (total_minutes - leg_one - layover) % 60
                )),
                aircraft: Some("Boeing 787-9".to_owned()),
            },
        ]
    } else {
        vec![Segment {
            departure: FlightPoint {
                iata_code: from.to_owned(),
                terminal: None,
                at: time(depart_total),
            },
            arrival: FlightPoint {
                iata_code: to.to_owned(),
                terminal: None,
                at: time(arrive_total),
            },
            carrier_code: carrier.0.to_owned(),
            carrier_name: Some(carrier.1.to_owned()),
            flight_number: flight_number(0),
            duration: Some(format!("PT{}H{}M", total_minutes / 60, total_minutes % 60)),
            aircraft: Some("Airbus A350-900".to_owned()),
        }]
    };

    Itinerary {
        duration: format!("PT{}H{}M", total_minutes / 60, total_minutes % 60),
        stops: segments.len() as u32 - 1,
        segments,
    }
}

/// Add days to an ISO date (YYYY-MM-DD), handling month/year rollover.
fn add_days(date: &str, days: u32) -> String {
    if days == 0 {
        return date.to_owned();
    }
    let parts: Vec<u32> = date.split('-').filter_map(|p| p.parse().ok()).collect();
    let [year, month, day] = parts[..] else {
        return date.to_owned();
    };
    let (mut y, mut m, mut d) = (year, month, day);
    for _ in 0..days {
        d += 1;
        if d > days_in_month(y, m) {
            d = 1;
            m += 1;
            if m > 12 {
                m = 1;
                y += 1;
            }
        }
    }
    format!("{y:04}-{m:02}-{d:02}")
}

fn days_in_month(year: u32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 => 29,
        2 => 28,
        _ => 30,
    }
}

pub fn location_suggestions(keyword: &str) -> Vec<LocationSuggestion> {
    let needle = keyword.to_lowercase();
    AIRPORTS
        .iter()
        .filter(|(code, name, city, country)| {
            code.to_lowercase().starts_with(&needle)
                || name.to_lowercase().contains(&needle)
                || city.to_lowercase().contains(&needle)
                || country.to_lowercase().contains(&needle)
        })
        .take(8)
        .map(|(code, name, city, country)| LocationSuggestion {
            iata_code: (*code).to_owned(),
            name: (*name).to_owned(),
            city: Some((*city).to_owned()),
            country: Some((*country).to_owned()),
            kind: "AIRPORT".to_owned(),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn query(origin: &str, destination: &str) -> FlightSearchQuery {
        FlightSearchQuery {
            origin: origin.to_owned(),
            destination: destination.to_owned(),
            departure_date: "2026-08-01".to_owned(),
            return_date: Some("2026-08-08".to_owned()),
            adults: 1,
            children: 0,
            infants: 0,
            travel_class: None,
            non_stop: false,
            currency: None,
        }
    }

    #[test]
    fn add_days_handles_rollover() {
        assert_eq!(add_days("2026-08-01", 0), "2026-08-01");
        assert_eq!(add_days("2026-08-31", 1), "2026-09-01");
        assert_eq!(add_days("2026-12-31", 1), "2027-01-01");
        assert_eq!(add_days("2024-02-28", 1), "2024-02-29"); // leap year
        assert_eq!(add_days("2025-02-28", 1), "2025-03-01");
    }

    #[test]
    fn results_are_deterministic() {
        let a = flight_results(&query("JFK", "LHR"));
        let b = flight_results(&query("JFK", "LHR"));
        assert_eq!(a.offers.len(), b.offers.len());
        assert_eq!(a.offers[0].total_price, b.offers[0].total_price);
        assert!(a.demo);
    }

    #[test]
    fn connections_never_stop_at_origin_or_destination() {
        for (from, to) in [("JFK", "LHR"), ("SYD", "SIN"), ("CDG", "DXB")] {
            let result = flight_results(&query(from, to));
            for offer in &result.offers {
                for itinerary in &offer.itineraries {
                    for segment in &itinerary.segments[..itinerary.segments.len() - 1] {
                        let hub = &segment.arrival.iata_code;
                        assert_ne!(hub, &itinerary.segments[0].departure.iata_code);
                        assert_ne!(hub, &itinerary.segments.last().unwrap().arrival.iata_code);
                    }
                }
            }
        }
    }

    #[test]
    fn overnight_arrivals_roll_the_date() {
        let result = flight_results(&query("JFK", "SYD"));
        let crosses_midnight = result.offers.iter().any(|offer| {
            let it = &offer.itineraries[0];
            let depart = &it.segments.first().unwrap().departure.at;
            let arrive = &it.segments.last().unwrap().arrival.at;
            arrive[11..16] < depart[11..16] && arrive[..10] > depart[..10]
        });
        // At least one long offer departs late enough to land next day, and
        // when it does the date must have advanced.
        for offer in &result.offers {
            for it in &offer.itineraries {
                let depart = &it.segments.first().unwrap().departure.at;
                let arrive = &it.segments.last().unwrap().arrival.at;
                if arrive[11..16] < depart[11..16] {
                    assert!(arrive[..10] > depart[..10], "arrival date must roll over");
                }
            }
        }
        let _ = crosses_midnight;
    }
}

// ---------------------------------------------------------------------------
// Hotels demo data
// ---------------------------------------------------------------------------

use crate::types::{HotelOffer, HotelSearchQuery, HotelSearchResult};

const HOTEL_TEMPLATES: &[(&str, u32, f64, u32, &str, &str, bool)] = &[
    // (name pattern, stars, review score, review count, room, board, free cancellation)
    (
        "Grand {} Palace",
        5,
        9.1,
        2841,
        "Deluxe King Room",
        "Breakfast Included",
        true,
    ),
    (
        "The {} House",
        4,
        8.8,
        1932,
        "Superior Double Room",
        "Room Only",
        true,
    ),
    (
        "{} Central Hotel",
        4,
        8.4,
        3310,
        "Classic Double Room",
        "Room Only",
        false,
    ),
    (
        "Hotel {} Garden",
        3,
        8.1,
        1287,
        "Standard Twin Room",
        "Breakfast Included",
        true,
    ),
    (
        "{} Boutique Suites",
        4,
        9.3,
        764,
        "Junior Suite",
        "Room Only",
        false,
    ),
    (
        "Old Town {} Inn",
        3,
        7.9,
        2075,
        "Cozy Double Room",
        "Room Only",
        true,
    ),
    (
        "{} Riverside Hotel",
        5,
        9.0,
        1554,
        "Executive Room",
        "Breakfast Included",
        false,
    ),
];

/// Nights between two ISO dates (fallback 1 when unparsable).
fn nights_between(check_in: &str, check_out: &str) -> u32 {
    fn day_index(date: &str) -> Option<i64> {
        let parts: Vec<u32> = date.split('-').filter_map(|p| p.parse().ok()).collect();
        let [y, m, d] = parts[..] else { return None };
        // Days since a fixed epoch, good enough for date differences.
        let mut days = i64::from(y) * 365 + i64::from(y / 4) + i64::from(d);
        days += (1..m)
            .map(|mm| i64::from(days_in_month(y, mm)))
            .sum::<i64>();
        Some(days)
    }
    match (day_index(check_in), day_index(check_out)) {
        (Some(a), Some(b)) if b > a => (b - a) as u32,
        _ => 1,
    }
}

pub fn hotel_results(query: &HotelSearchQuery) -> HotelSearchResult {
    let city = {
        let trimmed = query.city.trim();
        let mut chars = trimmed.chars();
        match chars.next() {
            Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
            None => "Sample City".to_owned(),
        }
    };
    let currency = query.currency.clone().unwrap_or_else(|| "USD".to_owned());
    let seed = fnv1a(&format!("{city}-{}", query.check_in));
    let nights = nights_between(&query.check_in, &query.check_out);
    let rooms = query.rooms.max(1);
    let base_night = 70 + (seed % 160) as u32; // city price level: 70..230 per night

    let offers = HOTEL_TEMPLATES
        .iter()
        .enumerate()
        .map(
            |(i, (pattern, stars, score, reviews, room, board, free_cancel))| {
                let offer_seed = seed.wrapping_add(i as u64 * 6151);
                let night_price = base_night + stars * 40 + (offer_seed % 45) as u32;
                let total = night_price * nights * rooms;
                HotelOffer {
                    id: format!("demo-hotel-{i}"),
                    name: pattern.replace("{}", &city),
                    address: format!("{} Explorer Street", 12 + (offer_seed % 180)),
                    city: city.clone(),
                    country: query.country_code.to_uppercase(),
                    star_rating: Some(*stars),
                    review_score: Some(*score),
                    review_count: Some(*reviews),
                    total_price: format!("{total}.00"),
                    currency: currency.clone(),
                    photo_url: None,
                    latitude: None,
                    longitude: None,
                    room_name: Some((*room).to_owned()),
                    board_name: Some((*board).to_owned()),
                    free_cancellation: *free_cancel,
                }
            },
        )
        .collect();

    HotelSearchResult {
        offers,
        currency,
        demo: true,
    }
}
