//! Duffel flight-search client (https://duffel.com).
//!
//! Duffel replaced Amadeus as our provider when the Amadeus self-service
//! portal was decommissioned on 2026-07-17. Free test-mode API keys
//! (`duffel_test_…`) are available instantly at app.duffel.com; live keys
//! unlock real content and booking later on the roadmap.

use serde_json::json;

use crate::demo;
use crate::error::{provider_error, ApiError};
use crate::types::{
    validate_query, FlightOffer, FlightPoint, FlightSearchQuery, FlightSearchResult, Itinerary,
    LocationSuggestion, Segment,
};

const PROVIDER: &str = "Duffel";
const BASE_URL: &str = "https://api.duffel.com";
const MAX_OFFERS: usize = 30;

pub struct DuffelClient {
    http: reqwest::Client,
    api_key: Option<String>,
}

impl DuffelClient {
    pub fn from_env() -> Self {
        let api_key = std::env::var("DUFFEL_API_KEY")
            .ok()
            .map(|v| v.trim().to_owned())
            .filter(|v| !v.is_empty());
        Self {
            http: reqwest::Client::new(),
            api_key,
        }
    }

    /// A client with no key, always serving demo data. Used by tests.
    #[cfg(test)]
    pub(crate) fn unconfigured() -> Self {
        Self {
            http: reqwest::Client::new(),
            api_key: None,
        }
    }

    pub fn is_configured(&self) -> bool {
        self.api_key.is_some()
    }

    /// "test" | "live" | "demo", inferred from the key prefix.
    pub fn environment(&self) -> &'static str {
        match self.api_key.as_deref() {
            Some(key) if key.starts_with("duffel_test") => "test",
            Some(_) => "live",
            None => "demo",
        }
    }

    pub async fn search_flights(
        &self,
        query: &FlightSearchQuery,
    ) -> Result<FlightSearchResult, ApiError> {
        validate_query(query)?;

        let Some(api_key) = self.api_key.as_deref() else {
            return Ok(demo::flight_results(query));
        };

        let mut slices = vec![json!({
            "origin": query.origin.to_uppercase(),
            "destination": query.destination.to_uppercase(),
            "departure_date": query.departure_date,
        })];
        if let Some(return_date) = query.return_date.as_deref().filter(|d| !d.is_empty()) {
            slices.push(json!({
                "origin": query.destination.to_uppercase(),
                "destination": query.origin.to_uppercase(),
                "departure_date": return_date,
            }));
        }

        // Duffel passenger typing: adults by type, minors by age.
        let mut passengers: Vec<serde_json::Value> = Vec::new();
        for _ in 0..query.adults.max(1) {
            passengers.push(json!({ "type": "adult" }));
        }
        for _ in 0..query.children {
            passengers.push(json!({ "age": 8 }));
        }
        for _ in 0..query.infants {
            passengers.push(json!({ "age": 1 }));
        }

        let mut data = json!({
            "slices": slices,
            "passengers": passengers,
            "cabin_class": cabin_class(query.travel_class.as_deref()),
        });
        if query.non_stop {
            data["max_connections"] = json!(0);
        }

        let response = self
            .http
            .post(format!("{BASE_URL}/air/offer_requests?return_offers=true"))
            .bearer_auth(api_key)
            .header("Duffel-Version", "v2")
            .header("Accept", "application/json")
            .json(&json!({ "data": data }))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(provider_error(PROVIDER, response).await);
        }

        let body: wire::OfferRequestResponse =
            response.json().await.map_err(|e| ApiError::Decode {
                provider: PROVIDER,
                message: e.to_string(),
            })?;

        Ok(map_offers(body, query))
    }

    pub async fn search_locations(
        &self,
        keyword: &str,
    ) -> Result<Vec<LocationSuggestion>, ApiError> {
        let keyword = keyword.trim();
        if keyword.len() < 2 {
            return Ok(Vec::new());
        }

        let Some(api_key) = self.api_key.as_deref() else {
            return Ok(demo::location_suggestions(keyword));
        };

        let response = self
            .http
            .get(format!("{BASE_URL}/places/suggestions"))
            .bearer_auth(api_key)
            .header("Duffel-Version", "v2")
            .header("Accept", "application/json")
            .query(&[("query", keyword)])
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(provider_error(PROVIDER, response).await);
        }

        let body: wire::PlacesResponse = response.json().await.map_err(|e| ApiError::Decode {
            provider: PROVIDER,
            message: e.to_string(),
        })?;

        Ok(body
            .data
            .into_iter()
            .filter_map(|place| {
                Some(LocationSuggestion {
                    iata_code: place.iata_code?,
                    name: place.name.unwrap_or_default(),
                    city: place.city_name,
                    country: place.iata_country_code,
                    kind: place
                        .place_type
                        .map(|t| t.to_uppercase())
                        .unwrap_or_else(|| "AIRPORT".to_owned()),
                })
            })
            .take(8)
            .collect())
    }
}

fn cabin_class(travel_class: Option<&str>) -> &'static str {
    match travel_class {
        Some("PREMIUM_ECONOMY") => "premium_economy",
        Some("BUSINESS") => "business",
        Some("FIRST") => "first",
        _ => "economy",
    }
}

/// Duffel returns RFC 3339-ish local datetimes ("2026-08-17T09:45:00");
/// normalize to our seconds-precision local format.
fn local_datetime(value: &str) -> String {
    value.chars().take(19).collect()
}

fn map_offers(body: wire::OfferRequestResponse, query: &FlightSearchQuery) -> FlightSearchResult {
    let mut offers: Vec<FlightOffer> = body
        .data
        .offers
        .into_iter()
        .map(|offer| FlightOffer {
            id: offer.id,
            total_price: offer.total_amount,
            currency: offer.total_currency,
            validating_airline: offer.owner.and_then(|o| o.name),
            // Duffel does not expose remaining-seat counts on offers.
            seats_remaining: None,
            itineraries: offer
                .slices
                .into_iter()
                .map(|slice| Itinerary {
                    duration: slice.duration.unwrap_or_default(),
                    stops: slice.segments.len().saturating_sub(1) as u32,
                    segments: slice
                        .segments
                        .into_iter()
                        .map(|segment| Segment {
                            departure: FlightPoint {
                                iata_code: segment
                                    .origin
                                    .and_then(|p| p.iata_code)
                                    .unwrap_or_default(),
                                terminal: None,
                                at: local_datetime(&segment.departing_at.unwrap_or_default()),
                            },
                            arrival: FlightPoint {
                                iata_code: segment
                                    .destination
                                    .and_then(|p| p.iata_code)
                                    .unwrap_or_default(),
                                terminal: None,
                                at: local_datetime(&segment.arriving_at.unwrap_or_default()),
                            },
                            carrier_code: segment
                                .marketing_carrier
                                .as_ref()
                                .and_then(|c| c.iata_code.clone())
                                .unwrap_or_default(),
                            carrier_name: segment.marketing_carrier.and_then(|c| c.name),
                            flight_number: segment
                                .marketing_carrier_flight_number
                                .unwrap_or_default(),
                            duration: segment.duration,
                            aircraft: segment.aircraft.and_then(|a| a.name),
                        })
                        .collect(),
                })
                .collect(),
        })
        .collect();

    // Cheapest first, capped — the frontend re-sorts as the user likes.
    offers.sort_by(|a, b| {
        a.total_price
            .parse::<f64>()
            .unwrap_or(f64::MAX)
            .total_cmp(&b.total_price.parse::<f64>().unwrap_or(f64::MAX))
    });
    offers.truncate(MAX_OFFERS);

    let currency = offers
        .first()
        .map(|o| o.currency.clone())
        .or_else(|| query.currency.clone())
        .unwrap_or_else(|| "USD".to_owned());

    FlightSearchResult {
        offers,
        currency,
        demo: false,
    }
}

// ---------------------------------------------------------------------------
// Duffel wire formats (only the fields we consume).
// ---------------------------------------------------------------------------

mod wire {
    use serde::Deserialize;

    #[derive(Deserialize)]
    pub struct OfferRequestResponse {
        pub data: OfferRequest,
    }

    #[derive(Deserialize)]
    pub struct OfferRequest {
        #[serde(default)]
        pub offers: Vec<Offer>,
    }

    #[derive(Deserialize)]
    pub struct Offer {
        pub id: String,
        pub total_amount: String,
        pub total_currency: String,
        pub owner: Option<Carrier>,
        #[serde(default)]
        pub slices: Vec<Slice>,
    }

    #[derive(Deserialize)]
    pub struct Slice {
        pub duration: Option<String>,
        #[serde(default)]
        pub segments: Vec<Segment>,
    }

    #[derive(Deserialize)]
    pub struct Segment {
        pub origin: Option<Place>,
        pub destination: Option<Place>,
        pub departing_at: Option<String>,
        pub arriving_at: Option<String>,
        pub duration: Option<String>,
        pub marketing_carrier: Option<Carrier>,
        pub marketing_carrier_flight_number: Option<String>,
        pub aircraft: Option<Aircraft>,
    }

    #[derive(Deserialize)]
    pub struct Place {
        pub iata_code: Option<String>,
    }

    #[derive(Deserialize, Clone)]
    pub struct Carrier {
        pub name: Option<String>,
        pub iata_code: Option<String>,
    }

    #[derive(Deserialize)]
    pub struct Aircraft {
        pub name: Option<String>,
    }

    #[derive(Deserialize)]
    pub struct PlacesResponse {
        #[serde(default)]
        pub data: Vec<PlaceSuggestion>,
    }

    #[derive(Deserialize)]
    pub struct PlaceSuggestion {
        pub iata_code: Option<String>,
        pub name: Option<String>,
        pub city_name: Option<String>,
        pub iata_country_code: Option<String>,
        #[serde(rename = "type")]
        pub place_type: Option<String>,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_a_duffel_offer_into_domain_types() {
        let raw = serde_json::json!({
            "data": {
                "offers": [{
                    "id": "off_123",
                    "total_amount": "412.50",
                    "total_currency": "USD",
                    "owner": { "name": "British Airways", "iata_code": "BA" },
                    "slices": [{
                        "duration": "PT7H15M",
                        "segments": [{
                            "origin": { "iata_code": "JFK" },
                            "destination": { "iata_code": "LHR" },
                            "departing_at": "2026-08-17T09:45:00",
                            "arriving_at": "2026-08-17T21:00:00",
                            "duration": "PT7H15M",
                            "marketing_carrier": { "name": "British Airways", "iata_code": "BA" },
                            "marketing_carrier_flight_number": "112",
                            "aircraft": { "name": "Boeing 777-300ER" }
                        }]
                    }]
                }]
            }
        });
        let body: wire::OfferRequestResponse = serde_json::from_value(raw).unwrap();
        let query = FlightSearchQuery {
            origin: "JFK".into(),
            destination: "LHR".into(),
            departure_date: "2026-08-17".into(),
            return_date: None,
            adults: 1,
            children: 0,
            infants: 0,
            travel_class: None,
            non_stop: false,
            currency: None,
        };

        let result = map_offers(body, &query);
        assert_eq!(result.currency, "USD");
        assert!(!result.demo);
        let offer = &result.offers[0];
        assert_eq!(offer.total_price, "412.50");
        assert_eq!(offer.validating_airline.as_deref(), Some("British Airways"));
        let segment = &offer.itineraries[0].segments[0];
        assert_eq!(segment.departure.iata_code, "JFK");
        assert_eq!(segment.arrival.iata_code, "LHR");
        assert_eq!(segment.flight_number, "112");
        assert_eq!(segment.departure.at, "2026-08-17T09:45:00");
    }

    #[test]
    fn cabin_class_maps_to_duffel_values() {
        assert_eq!(cabin_class(Some("BUSINESS")), "business");
        assert_eq!(cabin_class(Some("PREMIUM_ECONOMY")), "premium_economy");
        assert_eq!(cabin_class(Some("FIRST")), "first");
        assert_eq!(cabin_class(None), "economy");
        assert_eq!(cabin_class(Some("ECONOMY")), "economy");
    }
}

#[cfg(test)]
mod live_tests {
    use super::*;

    /// Exercises the real Duffel endpoint through the production code path.
    /// Run with: set -a; source ../.env; set +a; cargo test -- --ignored
    #[tokio::test]
    #[ignore = "live API call; requires DUFFEL_API_KEY in the environment"]
    async fn live_flight_search_returns_offers() {
        let client = DuffelClient::from_env();
        assert!(client.is_configured(), "DUFFEL_API_KEY not set");
        let query = FlightSearchQuery {
            origin: "JFK".into(),
            destination: "LHR".into(),
            departure_date: "2026-08-17".into(),
            return_date: None,
            adults: 1,
            children: 0,
            infants: 0,
            travel_class: None,
            non_stop: false,
            currency: None,
        };
        let result = client.search_flights(&query).await.expect("search failed");
        assert!(!result.demo);
        assert!(!result.offers.is_empty(), "expected live flight offers");
        let offer = &result.offers[0];
        assert!(!offer.itineraries.is_empty());
        assert!(offer.total_price.parse::<f64>().unwrap() > 0.0);
    }
}
