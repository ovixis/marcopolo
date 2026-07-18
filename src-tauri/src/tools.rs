//! Shared travel-tool registry: one definition + dispatcher used by both the
//! MCP server (external AI clients) and the built-in Ask Marco chat agent.

use std::sync::Arc;

use serde_json::{json, Value};

use crate::demo;
use crate::duffel::DuffelClient;
use crate::liteapi::LiteApiClient;
use crate::types::{ExperienceSearchQuery, FlightSearchQuery, HotelSearchQuery};

#[derive(Clone)]
pub struct ToolContext {
    pub flights: Arc<DuffelClient>,
    pub hotels: Arc<LiteApiClient>,
}

/// One tool definition, provider-agnostic. Each consumer (MCP, Anthropic,
/// OpenAI-compatible) wraps `schema` in its own envelope.
pub struct ToolDef {
    pub name: &'static str,
    pub title: &'static str,
    pub description: &'static str,
    pub schema: Value,
}

pub fn definitions() -> Vec<ToolDef> {
    vec![
        ToolDef {
            name: "search_flights",
            title: "Search flights",
            description: "Search live flight offers between two airports. Results include airlines, times, stops, durations, and total prices. When no provider API key is configured the app returns clearly-flagged demo data (result field `demo: true`).",
            schema: json!({
                "type": "object",
                "properties": {
                    "origin": { "type": "string", "description": "Origin IATA code, e.g. JFK" },
                    "destination": { "type": "string", "description": "Destination IATA code, e.g. LHR" },
                    "departureDate": { "type": "string", "description": "ISO date, e.g. 2026-08-17" },
                    "returnDate": { "type": "string", "description": "ISO date; omit for one-way" },
                    "adults": { "type": "integer", "minimum": 1, "default": 1 },
                    "children": { "type": "integer", "minimum": 0 },
                    "infants": { "type": "integer", "minimum": 0 },
                    "travelClass": { "type": "string", "enum": ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"] },
                    "nonStop": { "type": "boolean", "description": "Only nonstop itineraries" },
                    "currency": { "type": "string", "description": "ISO 4217, e.g. USD" }
                },
                "required": ["origin", "destination", "departureDate", "adults"]
            }),
        },
        ToolDef {
            name: "search_hotels",
            title: "Search hotels",
            description: "Search hotel stays in a city with live rates: names, stars, guest scores, cheapest room and board, cancellation flags, and total stay prices. When no provider API key is configured the app returns clearly-flagged demo data (result field `demo: true`).",
            schema: json!({
                "type": "object",
                "properties": {
                    "city": { "type": "string", "description": "City name, e.g. Rome" },
                    "countryCode": { "type": "string", "description": "ISO 3166-1 alpha-2, e.g. IT" },
                    "checkIn": { "type": "string", "description": "ISO date" },
                    "checkOut": { "type": "string", "description": "ISO date" },
                    "adults": { "type": "integer", "minimum": 1, "default": 2 },
                    "children": { "type": "integer", "minimum": 0 },
                    "rooms": { "type": "integer", "minimum": 1, "default": 1 },
                    "currency": { "type": "string", "description": "ISO 4217, e.g. EUR" }
                },
                "required": ["city", "countryCode", "checkIn", "checkOut", "adults", "rooms"]
            }),
        },
        ToolDef {
            name: "search_experiences",
            title: "Search experiences",
            description: "Tours, food crawls, and activities in a city with durations, ratings, and per-person prices. Currently sample data (result field `demo: true`) until a live provider is integrated.",
            schema: json!({
                "type": "object",
                "properties": {
                    "city": { "type": "string", "description": "City name, e.g. Rome" },
                    "currency": { "type": "string", "description": "ISO 4217, e.g. EUR" }
                },
                "required": ["city"]
            }),
        },
        ToolDef {
            name: "search_locations",
            title: "Search airports & cities",
            description: "Resolve a free-text place name into airport/city IATA codes. Use this before search_flights when the user gives a city name instead of a code.",
            schema: json!({
                "type": "object",
                "properties": {
                    "keyword": { "type": "string", "description": "Free text, e.g. 'Tokyo' or 'Heathrow'" }
                },
                "required": ["keyword"]
            }),
        },
    ]
}

pub async fn call(context: &ToolContext, name: &str, arguments: Value) -> Result<String, String> {
    match name {
        "search_flights" => {
            let query: FlightSearchQuery =
                serde_json::from_value(arguments).map_err(|e| format!("invalid arguments: {e}"))?;
            let result = context
                .flights
                .search_flights(&query)
                .await
                .map_err(|e| e.to_string())?;
            serde_json::to_string_pretty(&result).map_err(|e| e.to_string())
        }
        "search_hotels" => {
            let query: HotelSearchQuery =
                serde_json::from_value(arguments).map_err(|e| format!("invalid arguments: {e}"))?;
            let result = context
                .hotels
                .search_hotels(&query)
                .await
                .map_err(|e| e.to_string())?;
            serde_json::to_string_pretty(&result).map_err(|e| e.to_string())
        }
        "search_experiences" => {
            let query: ExperienceSearchQuery =
                serde_json::from_value(arguments).map_err(|e| format!("invalid arguments: {e}"))?;
            let result = demo::experience_results(&query);
            serde_json::to_string_pretty(&result).map_err(|e| e.to_string())
        }
        "search_locations" => {
            let keyword = arguments
                .get("keyword")
                .and_then(|k| k.as_str())
                .ok_or_else(|| "invalid arguments: keyword (string) is required".to_owned())?;
            let result = context
                .flights
                .search_locations(keyword)
                .await
                .map_err(|e| e.to_string())?;
            serde_json::to_string_pretty(&result).map_err(|e| e.to_string())
        }
        other => Err(format!("unknown tool: {other}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn demo_context() -> ToolContext {
        ToolContext {
            flights: Arc::new(DuffelClient::unconfigured()),
            hotels: Arc::new(LiteApiClient::unconfigured()),
        }
    }

    #[tokio::test]
    async fn dispatches_experiences_tool() {
        let text = call(
            &demo_context(),
            "search_experiences",
            json!({ "city": "Rome" }),
        )
        .await
        .unwrap();
        let parsed: Value = serde_json::from_str(&text).unwrap();
        assert_eq!(parsed["demo"], true);
        assert!(!parsed["offers"].as_array().unwrap().is_empty());
    }

    #[test]
    fn four_tools_are_defined() {
        let names: Vec<&str> = definitions().iter().map(|d| d.name).collect();
        assert_eq!(
            names,
            vec![
                "search_flights",
                "search_hotels",
                "search_experiences",
                "search_locations"
            ]
        );
    }
}
