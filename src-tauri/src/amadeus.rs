use std::collections::HashMap;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};

use crate::demo;
use crate::error::{provider_error, ApiError};

const PROVIDER: &str = "Amadeus";

// ---------------------------------------------------------------------------
// Query / result types shared with the frontend (camelCase over IPC).
// Keep these in sync with `src/lib/types/flights.ts`.
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightSearchQuery {
    pub origin: String,
    pub destination: String,
    /// ISO date, e.g. "2026-08-01"
    pub departure_date: String,
    pub return_date: Option<String>,
    pub adults: u32,
    #[serde(default)]
    pub children: u32,
    #[serde(default)]
    pub infants: u32,
    /// ECONOMY | PREMIUM_ECONOMY | BUSINESS | FIRST
    pub travel_class: Option<String>,
    #[serde(default)]
    pub non_stop: bool,
    pub currency: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FlightSearchResult {
    pub offers: Vec<FlightOffer>,
    pub currency: String,
    /// True when results are locally generated because no API key is configured.
    pub demo: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FlightOffer {
    pub id: String,
    pub total_price: String,
    pub currency: String,
    pub itineraries: Vec<Itinerary>,
    pub validating_airline: Option<String>,
    pub seats_remaining: Option<u32>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Itinerary {
    /// ISO-8601 duration, e.g. "PT11H35M"
    pub duration: String,
    pub stops: u32,
    pub segments: Vec<Segment>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Segment {
    pub departure: FlightPoint,
    pub arrival: FlightPoint,
    pub carrier_code: String,
    pub carrier_name: Option<String>,
    pub flight_number: String,
    pub duration: Option<String>,
    pub aircraft: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FlightPoint {
    pub iata_code: String,
    pub terminal: Option<String>,
    /// Local datetime, e.g. "2026-08-01T09:35:00"
    pub at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LocationSuggestion {
    pub iata_code: String,
    pub name: String,
    pub city: Option<String>,
    pub country: Option<String>,
    /// AIRPORT or CITY
    pub kind: String,
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

struct Credentials {
    client_id: String,
    client_secret: String,
}

struct CachedToken {
    value: String,
    expires_at: Instant,
}

pub struct AmadeusClient {
    http: reqwest::Client,
    base_url: String,
    environment: String,
    credentials: Option<Credentials>,
    token: tokio::sync::Mutex<Option<CachedToken>>,
}

impl AmadeusClient {
    pub fn from_env() -> Self {
        let non_empty = |key: &str| std::env::var(key).ok().filter(|v| !v.trim().is_empty());
        let credentials = match (
            non_empty("AMADEUS_CLIENT_ID"),
            non_empty("AMADEUS_CLIENT_SECRET"),
        ) {
            (Some(client_id), Some(client_secret)) => Some(Credentials {
                client_id,
                client_secret,
            }),
            _ => None,
        };
        let environment = match std::env::var("AMADEUS_ENV").as_deref() {
            Ok("production") => "production",
            _ => "test",
        };
        let base_url = if environment == "production" {
            "https://api.amadeus.com"
        } else {
            "https://test.api.amadeus.com"
        };
        Self {
            http: reqwest::Client::new(),
            base_url: base_url.to_owned(),
            environment: environment.to_owned(),
            credentials,
            token: tokio::sync::Mutex::new(None),
        }
    }

    pub fn is_configured(&self) -> bool {
        self.credentials.is_some()
    }

    pub fn environment(&self) -> &str {
        &self.environment
    }

    async fn access_token(&self) -> Result<String, ApiError> {
        let credentials = self
            .credentials
            .as_ref()
            .expect("access_token called without credentials");

        let mut guard = self.token.lock().await;
        if let Some(token) = guard.as_ref() {
            if token.expires_at > Instant::now() {
                return Ok(token.value.clone());
            }
        }

        #[derive(Deserialize)]
        struct TokenResponse {
            access_token: String,
            expires_in: u64,
        }

        let response = self
            .http
            .post(format!("{}/v1/security/oauth2/token", self.base_url))
            .form(&[
                ("grant_type", "client_credentials"),
                ("client_id", credentials.client_id.as_str()),
                ("client_secret", credentials.client_secret.as_str()),
            ])
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(provider_error(PROVIDER, response).await);
        }

        let token: TokenResponse = response.json().await.map_err(|e| ApiError::Decode {
            provider: PROVIDER,
            message: e.to_string(),
        })?;

        // Refresh a minute early so in-flight requests never race expiry.
        let value = token.access_token.clone();
        *guard = Some(CachedToken {
            value: token.access_token,
            expires_at: Instant::now() + Duration::from_secs(token.expires_in.saturating_sub(60)),
        });
        Ok(value)
    }

    pub async fn search_flights(
        &self,
        query: &FlightSearchQuery,
    ) -> Result<FlightSearchResult, ApiError> {
        validate_query(query)?;

        if !self.is_configured() {
            return Ok(demo::flight_results(query));
        }

        let token = self.access_token().await?;
        let currency = query.currency.clone().unwrap_or_else(|| "USD".to_owned());

        let mut params: Vec<(&str, String)> = vec![
            ("originLocationCode", query.origin.to_uppercase()),
            ("destinationLocationCode", query.destination.to_uppercase()),
            ("departureDate", query.departure_date.clone()),
            ("adults", query.adults.max(1).to_string()),
            ("currencyCode", currency.clone()),
            ("max", "30".to_owned()),
        ];
        if let Some(return_date) = &query.return_date {
            if !return_date.is_empty() {
                params.push(("returnDate", return_date.clone()));
            }
        }
        if query.children > 0 {
            params.push(("children", query.children.to_string()));
        }
        if query.infants > 0 {
            params.push(("infants", query.infants.to_string()));
        }
        if let Some(class) = &query.travel_class {
            if !class.is_empty() {
                params.push(("travelClass", class.clone()));
            }
        }
        if query.non_stop {
            params.push(("nonStop", "true".to_owned()));
        }

        let response = self
            .http
            .get(format!("{}/v2/shopping/flight-offers", self.base_url))
            .bearer_auth(token)
            .query(&params)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(provider_error(PROVIDER, response).await);
        }

        let body: wire::FlightOffersResponse =
            response.json().await.map_err(|e| ApiError::Decode {
                provider: PROVIDER,
                message: e.to_string(),
            })?;

        Ok(map_offers(body, currency))
    }

    pub async fn search_locations(
        &self,
        keyword: &str,
    ) -> Result<Vec<LocationSuggestion>, ApiError> {
        let keyword = keyword.trim();
        if keyword.len() < 2 {
            return Ok(Vec::new());
        }

        if !self.is_configured() {
            return Ok(demo::location_suggestions(keyword));
        }

        let token = self.access_token().await?;
        let response = self
            .http
            .get(format!("{}/v1/reference-data/locations", self.base_url))
            .bearer_auth(token)
            .query(&[
                ("subType", "AIRPORT,CITY"),
                ("keyword", keyword),
                ("page[limit]", "8"),
                ("view", "LIGHT"),
            ])
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(provider_error(PROVIDER, response).await);
        }

        let body: wire::LocationsResponse =
            response.json().await.map_err(|e| ApiError::Decode {
                provider: PROVIDER,
                message: e.to_string(),
            })?;

        Ok(body
            .data
            .into_iter()
            .filter_map(|loc| {
                Some(LocationSuggestion {
                    iata_code: loc.iata_code?,
                    name: loc.name.unwrap_or_default(),
                    city: loc.address.as_ref().and_then(|a| a.city_name.clone()),
                    country: loc.address.as_ref().and_then(|a| a.country_name.clone()),
                    kind: loc.sub_type.unwrap_or_else(|| "AIRPORT".to_owned()),
                })
            })
            .collect())
    }
}

fn validate_query(query: &FlightSearchQuery) -> Result<(), ApiError> {
    let iata_ok = |code: &str| code.len() == 3 && code.chars().all(|c| c.is_ascii_alphabetic());
    if !iata_ok(&query.origin) {
        return Err(ApiError::InvalidInput(format!(
            "origin must be a 3-letter IATA code, got \"{}\"",
            query.origin
        )));
    }
    if !iata_ok(&query.destination) {
        return Err(ApiError::InvalidInput(format!(
            "destination must be a 3-letter IATA code, got \"{}\"",
            query.destination
        )));
    }
    if query.departure_date.len() != 10 {
        return Err(ApiError::InvalidInput(
            "departureDate must be an ISO date (YYYY-MM-DD)".to_owned(),
        ));
    }
    Ok(())
}

fn map_offers(body: wire::FlightOffersResponse, currency: String) -> FlightSearchResult {
    let carriers = body
        .dictionaries
        .as_ref()
        .and_then(|d| d.carriers.clone())
        .unwrap_or_default();
    let aircraft = body
        .dictionaries
        .as_ref()
        .and_then(|d| d.aircraft.clone())
        .unwrap_or_default();

    let offers = body
        .data
        .into_iter()
        .map(|offer| {
            let validating_airline = offer
                .validating_airline_codes
                .as_ref()
                .and_then(|codes| codes.first())
                .map(|code| resolve(&carriers, code));
            FlightOffer {
                id: offer.id,
                currency: offer
                    .price
                    .as_ref()
                    .map(|p| p.currency.clone())
                    .unwrap_or_else(|| currency.clone()),
                total_price: offer
                    .price
                    .as_ref()
                    .and_then(|p| p.grand_total.clone().or_else(|| p.total.clone()))
                    .unwrap_or_default(),
                validating_airline,
                seats_remaining: offer.number_of_bookable_seats,
                itineraries: offer
                    .itineraries
                    .into_iter()
                    .map(|it| Itinerary {
                        duration: it.duration.unwrap_or_default(),
                        stops: it.segments.len().saturating_sub(1) as u32,
                        segments: it
                            .segments
                            .into_iter()
                            .map(|seg| Segment {
                                carrier_name: Some(resolve(&carriers, &seg.carrier_code)),
                                aircraft: seg
                                    .aircraft
                                    .as_ref()
                                    .map(|a| resolve(&aircraft, &a.code)),
                                departure: FlightPoint {
                                    iata_code: seg.departure.iata_code,
                                    terminal: seg.departure.terminal,
                                    at: seg.departure.at,
                                },
                                arrival: FlightPoint {
                                    iata_code: seg.arrival.iata_code,
                                    terminal: seg.arrival.terminal,
                                    at: seg.arrival.at,
                                },
                                carrier_code: seg.carrier_code,
                                flight_number: seg.number,
                                duration: seg.duration,
                            })
                            .collect(),
                    })
                    .collect(),
            }
        })
        .collect();

    FlightSearchResult {
        offers,
        currency,
        demo: false,
    }
}

fn resolve(dictionary: &HashMap<String, String>, code: &str) -> String {
    dictionary
        .get(code)
        .cloned()
        .unwrap_or_else(|| code.to_owned())
}

// ---------------------------------------------------------------------------
// Amadeus wire formats (only the fields we consume).
// ---------------------------------------------------------------------------

mod wire {
    use std::collections::HashMap;

    use serde::Deserialize;

    #[derive(Deserialize)]
    pub struct FlightOffersResponse {
        #[serde(default)]
        pub data: Vec<Offer>,
        pub dictionaries: Option<Dictionaries>,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Offer {
        pub id: String,
        #[serde(default)]
        pub itineraries: Vec<Itinerary>,
        pub price: Option<Price>,
        pub validating_airline_codes: Option<Vec<String>>,
        pub number_of_bookable_seats: Option<u32>,
    }

    #[derive(Deserialize)]
    pub struct Itinerary {
        pub duration: Option<String>,
        #[serde(default)]
        pub segments: Vec<Segment>,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Segment {
        pub departure: Point,
        pub arrival: Point,
        pub carrier_code: String,
        pub number: String,
        pub duration: Option<String>,
        pub aircraft: Option<Aircraft>,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Point {
        pub iata_code: String,
        pub terminal: Option<String>,
        pub at: String,
    }

    #[derive(Deserialize)]
    pub struct Aircraft {
        pub code: String,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Price {
        pub currency: String,
        pub total: Option<String>,
        pub grand_total: Option<String>,
    }

    #[derive(Deserialize)]
    pub struct Dictionaries {
        pub carriers: Option<HashMap<String, String>>,
        pub aircraft: Option<HashMap<String, String>>,
    }

    #[derive(Deserialize)]
    pub struct LocationsResponse {
        #[serde(default)]
        pub data: Vec<Location>,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Location {
        pub sub_type: Option<String>,
        pub name: Option<String>,
        pub iata_code: Option<String>,
        pub address: Option<Address>,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Address {
        pub city_name: Option<String>,
        pub country_name: Option<String>,
    }
}
