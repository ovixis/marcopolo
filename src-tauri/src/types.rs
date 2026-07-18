//! Flight-search domain types shared by every provider (Duffel, demo, …).
//! Serialized camelCase over IPC — keep in sync with `src/lib/types/flights.ts`.

use serde::{Deserialize, Serialize};

use crate::error::ApiError;

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

pub fn validate_query(query: &FlightSearchQuery) -> Result<(), ApiError> {
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

// ---------------------------------------------------------------------------
// Hotels (LiteAPI / Nuitee) — mirror of `src/lib/types/hotels.ts`.
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HotelSearchQuery {
    pub city: String,
    /// ISO 3166-1 alpha-2, e.g. "IT"
    pub country_code: String,
    /// ISO date
    pub check_in: String,
    /// ISO date
    pub check_out: String,
    pub adults: u32,
    #[serde(default)]
    pub children: u32,
    pub rooms: u32,
    pub currency: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HotelSearchResult {
    pub offers: Vec<HotelOffer>,
    pub currency: String,
    /// True when results are locally generated because no API key is configured.
    pub demo: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HotelOffer {
    pub id: String,
    pub name: String,
    pub address: String,
    pub city: String,
    pub country: String,
    pub star_rating: Option<u32>,
    /// 0-10 guest review score
    pub review_score: Option<f64>,
    pub review_count: Option<u32>,
    /// Total stay price as decimal string
    pub total_price: String,
    pub currency: String,
    pub photo_url: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub room_name: Option<String>,
    pub board_name: Option<String>,
    pub free_cancellation: bool,
}

pub fn validate_hotel_query(query: &HotelSearchQuery) -> Result<(), ApiError> {
    if query.city.trim().is_empty() {
        return Err(ApiError::InvalidInput("city must not be empty".to_owned()));
    }
    let cc = query.country_code.trim();
    if cc.len() != 2 || !cc.chars().all(|c| c.is_ascii_alphabetic()) {
        return Err(ApiError::InvalidInput(format!(
            "countryCode must be a 2-letter ISO code, got \"{cc}\""
        )));
    }
    if query.check_in.len() != 10 || query.check_out.len() != 10 {
        return Err(ApiError::InvalidInput(
            "checkIn/checkOut must be ISO dates (YYYY-MM-DD)".to_owned(),
        ));
    }
    if query.check_out <= query.check_in {
        return Err(ApiError::InvalidInput(
            "checkOut must be after checkIn".to_owned(),
        ));
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Experiences (demo until a provider like Viator is integrated).
// Mirror of `src/lib/types/experiences.ts`.
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExperienceSearchQuery {
    pub city: String,
    pub currency: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExperienceSearchResult {
    pub offers: Vec<ExperienceOffer>,
    pub currency: String,
    pub demo: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExperienceOffer {
    pub id: String,
    pub title: String,
    pub description: String,
    pub category: String,
    /// ISO-8601 duration, e.g. "PT3H"
    pub duration: String,
    /// 0-5
    pub rating: f64,
    pub review_count: u32,
    pub price_per_person: String,
    pub currency: String,
    pub free_cancellation: bool,
}
