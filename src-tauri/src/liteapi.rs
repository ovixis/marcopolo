//! LiteAPI (Nuitee) hotel-search client — https://liteapi.travel
//!
//! Configured via `LITEAPI_API_KEY`. Prod keys (`prod_…`) return live rates;
//! searches are free, only confirmed bookings cost money. The account's
//! Flights API is a separate permission — flights stay on Duffel until
//! LiteAPI enables them for this key.

use serde_json::json;

use crate::demo;
use crate::error::{provider_error, ApiError};
use crate::types::{validate_hotel_query, HotelOffer, HotelSearchQuery, HotelSearchResult};

const PROVIDER: &str = "LiteAPI";
const BASE_URL: &str = "https://api.liteapi.travel/v3.0";
const MAX_HOTELS: usize = 25;

pub struct LiteApiClient {
    http: reqwest::Client,
    api_key: Option<String>,
}

impl LiteApiClient {
    pub fn from_env() -> Self {
        let api_key = std::env::var("LITEAPI_API_KEY")
            .ok()
            .map(|v| v.trim().to_owned())
            .filter(|v| !v.is_empty());
        Self {
            http: reqwest::Client::new(),
            api_key,
        }
    }

    pub fn is_configured(&self) -> bool {
        self.api_key.is_some()
    }

    /// "live" | "sandbox" | "demo", inferred from the key prefix.
    pub fn environment(&self) -> &'static str {
        match self.api_key.as_deref() {
            Some(key) if key.starts_with("sand_") => "sandbox",
            Some(_) => "live",
            None => "demo",
        }
    }

    pub async fn search_hotels(
        &self,
        query: &HotelSearchQuery,
    ) -> Result<HotelSearchResult, ApiError> {
        validate_hotel_query(query)?;

        let Some(api_key) = self.api_key.as_deref() else {
            return Ok(demo::hotel_results(query));
        };

        let currency = query.currency.clone().unwrap_or_else(|| "USD".to_owned());

        let body = json!({
            "cityName": query.city.trim(),
            "countryCode": query.country_code.trim().to_uppercase(),
            "checkin": query.check_in,
            "checkout": query.check_out,
            "occupancies": occupancies(query),
            "currency": currency,
            // Nationality only affects rate eligibility on some suppliers;
            // a fixed value keeps results deterministic for now.
            "guestNationality": "US",
            "limit": MAX_HOTELS,
            "maxRatesPerHotel": 1,
            "includeHotelData": true,
            "timeout": 10,
        });

        let response = self
            .http
            .post(format!("{BASE_URL}/hotels/rates"))
            .header("X-API-Key", api_key)
            .header("Accept", "application/json")
            .json(&body)
            .send()
            .await?;

        // 204 = no availability for these dates; an empty result, not an error.
        if response.status().as_u16() == 204 {
            return Ok(HotelSearchResult {
                offers: Vec::new(),
                currency,
                demo: false,
            });
        }
        if !response.status().is_success() {
            return Err(provider_error(PROVIDER, response).await);
        }

        let payload: wire::RatesResponse = response.json().await.map_err(|e| ApiError::Decode {
            provider: PROVIDER,
            message: e.to_string(),
        })?;

        Ok(map_hotels(payload, currency))
    }
}

/// Spread adults across the requested rooms; children ride in the first room.
fn occupancies(query: &HotelSearchQuery) -> Vec<serde_json::Value> {
    let rooms = query.rooms.max(1);
    let adults = query.adults.max(1);
    let base = adults / rooms;
    let extra = adults % rooms;
    (0..rooms)
        .map(|room| {
            let room_adults = (base + u32::from(room < extra)).max(1);
            if room == 0 && query.children > 0 {
                json!({
                    "adults": room_adults,
                    "children": vec![8; query.children as usize],
                })
            } else {
                json!({ "adults": room_adults })
            }
        })
        .collect()
}

fn map_hotels(payload: wire::RatesResponse, currency: String) -> HotelSearchResult {
    let mut offers: Vec<HotelOffer> = payload
        .data
        .into_iter()
        .filter_map(|entry| {
            let meta = payload.hotels.iter().find(|h| h.id == entry.hotel_id);

            // Cheapest rate across the hotel's room types.
            let best = entry
                .room_types
                .iter()
                .flat_map(|rt| rt.rates.iter())
                .filter_map(|rate| {
                    rate.retail_rate
                        .as_ref()
                        .and_then(|rr| rr.total.first())
                        .map(|total| (rate, total))
                })
                .min_by(|a, b| a.1.amount.total_cmp(&b.1.amount))?;
            let (rate, total) = best;

            Some(HotelOffer {
                id: entry.hotel_id.clone(),
                name: meta.and_then(|m| m.name.clone()).unwrap_or_default(),
                address: meta.and_then(|m| m.address.clone()).unwrap_or_default(),
                city: meta.and_then(|m| m.city_name.clone()).unwrap_or_default(),
                country: meta
                    .and_then(|m| m.country_code.clone())
                    .map(|c| c.to_uppercase())
                    .unwrap_or_default(),
                star_rating: meta.and_then(|m| m.stars),
                review_score: meta.and_then(|m| m.rating),
                review_count: meta.and_then(|m| m.review_count),
                total_price: format!("{:.2}", total.amount),
                currency: total.currency.clone(),
                photo_url: meta.and_then(|m| m.main_photo.clone()),
                latitude: meta.and_then(|m| m.latitude),
                longitude: meta.and_then(|m| m.longitude),
                room_name: rate.name.clone(),
                board_name: rate.board_name.clone(),
                free_cancellation: rate
                    .cancellation_policies
                    .as_ref()
                    .and_then(|c| c.refundable_tag.as_deref())
                    .map(|tag| tag.eq_ignore_ascii_case("RFN"))
                    .unwrap_or(false),
            })
        })
        .collect();

    offers.sort_by(|a, b| {
        a.total_price
            .parse::<f64>()
            .unwrap_or(f64::MAX)
            .total_cmp(&b.total_price.parse::<f64>().unwrap_or(f64::MAX))
    });

    let currency = offers
        .first()
        .map(|o| o.currency.clone())
        .unwrap_or(currency);

    HotelSearchResult {
        offers,
        currency,
        demo: false,
    }
}

// ---------------------------------------------------------------------------
// LiteAPI wire formats (only the fields we consume).
// ---------------------------------------------------------------------------

mod wire {
    use serde::Deserialize;

    #[derive(Deserialize)]
    pub struct RatesResponse {
        #[serde(default)]
        pub data: Vec<HotelRates>,
        #[serde(default)]
        pub hotels: Vec<HotelMeta>,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct HotelRates {
        pub hotel_id: String,
        #[serde(default)]
        pub room_types: Vec<RoomType>,
    }

    #[derive(Deserialize)]
    pub struct RoomType {
        #[serde(default)]
        pub rates: Vec<Rate>,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Rate {
        pub name: Option<String>,
        pub board_name: Option<String>,
        pub retail_rate: Option<RetailRate>,
        pub cancellation_policies: Option<CancellationPolicies>,
    }

    #[derive(Deserialize)]
    pub struct RetailRate {
        #[serde(default)]
        pub total: Vec<Money>,
    }

    #[derive(Deserialize)]
    pub struct Money {
        pub amount: f64,
        pub currency: String,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct CancellationPolicies {
        pub refundable_tag: Option<String>,
    }

    /// Hotel metadata (snake_case in LiteAPI responses).
    #[derive(Deserialize)]
    pub struct HotelMeta {
        pub id: String,
        pub name: Option<String>,
        pub main_photo: Option<String>,
        pub address: Option<String>,
        pub country_code: Option<String>,
        pub city_name: Option<String>,
        pub latitude: Option<f64>,
        pub longitude: Option<f64>,
        /// Guest review score, 0-10
        pub rating: Option<f64>,
        pub stars: Option<u32>,
        pub review_count: Option<u32>,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Trimmed from a real LiteAPI response captured on 2026-07-18.
    fn fixture() -> wire::RatesResponse {
        serde_json::from_value(serde_json::json!({
            "hotels": [{
                "id": "lpe2264",
                "name": "The Hive Hotel",
                "main_photo": "https://static.cupid.travel/hotels/444012256.jpg",
                "address": "Via Torino 6",
                "country_code": "it",
                "city_name": "Rome",
                "latitude": 41.899558,
                "longitude": 12.496689,
                "rating": 8.7,
                "stars": 4,
                "review_count": 8739
            }],
            "data": [{
                "hotelId": "lpe2264",
                "roomTypes": [{
                    "rates": [{
                        "name": "Superior Double room (full double bed)",
                        "boardName": "Room Only",
                        "retailRate": {
                            "total": [{ "amount": 391.54, "currency": "EUR" }]
                        },
                        "cancellationPolicies": { "refundableTag": "NRFN" }
                    }]
                }]
            }]
        }))
        .unwrap()
    }

    #[test]
    fn maps_liteapi_rates_into_domain_offers() {
        let result = map_hotels(fixture(), "EUR".to_owned());
        assert_eq!(result.offers.len(), 1);
        let offer = &result.offers[0];
        assert_eq!(offer.name, "The Hive Hotel");
        assert_eq!(offer.city, "Rome");
        assert_eq!(offer.country, "IT");
        assert_eq!(offer.total_price, "391.54");
        assert_eq!(offer.currency, "EUR");
        assert_eq!(offer.star_rating, Some(4));
        assert_eq!(offer.review_score, Some(8.7));
        assert_eq!(offer.board_name.as_deref(), Some("Room Only"));
        assert!(!offer.free_cancellation);
    }

    #[test]
    fn occupancies_spread_adults_and_seat_children_in_first_room() {
        let query = HotelSearchQuery {
            city: "Rome".into(),
            country_code: "IT".into(),
            check_in: "2026-08-20".into(),
            check_out: "2026-08-23".into(),
            adults: 3,
            children: 2,
            rooms: 2,
            currency: None,
        };
        let occ = occupancies(&query);
        assert_eq!(occ.len(), 2);
        assert_eq!(occ[0]["adults"], 2);
        assert_eq!(occ[0]["children"].as_array().unwrap().len(), 2);
        assert_eq!(occ[1]["adults"], 1);
        assert!(occ[1].get("children").is_none());
    }
}

#[cfg(test)]
mod live_tests {
    use super::*;

    /// Exercises the real LiteAPI endpoint through the production code path.
    /// Run with: set -a; source ../.env; set +a; cargo test -- --ignored
    #[tokio::test]
    #[ignore = "live API call; requires LITEAPI_API_KEY in the environment"]
    async fn live_hotel_search_returns_offers() {
        let client = LiteApiClient::from_env();
        assert!(client.is_configured(), "LITEAPI_API_KEY not set");
        let query = HotelSearchQuery {
            city: "Rome".into(),
            country_code: "IT".into(),
            check_in: "2026-08-20".into(),
            check_out: "2026-08-23".into(),
            adults: 2,
            children: 0,
            rooms: 1,
            currency: Some("EUR".into()),
        };
        let result = client.search_hotels(&query).await.expect("search failed");
        assert!(!result.demo);
        assert!(!result.offers.is_empty(), "expected live hotel offers");
        let offer = &result.offers[0];
        assert!(!offer.name.is_empty());
        assert!(offer.total_price.parse::<f64>().unwrap() > 0.0);
    }
}
