mod demo;
mod duffel;
mod error;
mod liteapi;
mod types;

use duffel::DuffelClient;
use error::ApiError;
use liteapi::LiteApiClient;
use serde::Serialize;
use types::{
    FlightSearchQuery, FlightSearchResult, HotelSearchQuery, HotelSearchResult, LocationSuggestion,
};

#[tauri::command]
async fn search_flights(
    state: tauri::State<'_, DuffelClient>,
    query: FlightSearchQuery,
) -> Result<FlightSearchResult, ApiError> {
    state.search_flights(&query).await
}

#[tauri::command]
async fn search_locations(
    state: tauri::State<'_, DuffelClient>,
    keyword: String,
) -> Result<Vec<LocationSuggestion>, ApiError> {
    state.search_locations(&keyword).await
}

#[tauri::command]
async fn search_hotels(
    state: tauri::State<'_, LiteApiClient>,
    query: HotelSearchQuery,
) -> Result<HotelSearchResult, ApiError> {
    state.search_hotels(&query).await
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BackendStatus {
    flights_provider: String,
    flights_configured: bool,
    /// "test" | "live" | "demo"
    environment: String,
    hotels_provider: String,
    hotels_configured: bool,
    /// "live" | "sandbox" | "demo"
    hotels_environment: String,
    version: String,
}

#[tauri::command]
fn backend_status(
    flights: tauri::State<'_, DuffelClient>,
    hotels: tauri::State<'_, LiteApiClient>,
) -> BackendStatus {
    BackendStatus {
        flights_provider: "duffel".to_owned(),
        flights_configured: flights.is_configured(),
        environment: flights.environment().to_owned(),
        hotels_provider: "liteapi".to_owned(),
        hotels_configured: hotels.is_configured(),
        hotels_environment: hotels.environment().to_owned(),
        version: env!("CARGO_PKG_VERSION").to_owned(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Best-effort .env loading for local development; production builds read
    // real environment variables.
    let _ = dotenvy::dotenv();

    tauri::Builder::default()
        .manage(DuffelClient::from_env())
        .manage(LiteApiClient::from_env())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            search_flights,
            search_locations,
            search_hotels,
            backend_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
