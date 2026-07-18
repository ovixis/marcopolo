mod demo;
mod duffel;
mod error;
mod types;

use duffel::DuffelClient;
use error::ApiError;
use serde::Serialize;
use types::{FlightSearchQuery, FlightSearchResult, LocationSuggestion};

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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BackendStatus {
    flights_provider: String,
    flights_configured: bool,
    /// "test" | "live" | "demo"
    environment: String,
    version: String,
}

#[tauri::command]
fn backend_status(state: tauri::State<'_, DuffelClient>) -> BackendStatus {
    BackendStatus {
        flights_provider: "duffel".to_owned(),
        flights_configured: state.is_configured(),
        environment: state.environment().to_owned(),
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
            backend_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
