mod amadeus;
mod demo;
mod error;

use amadeus::{AmadeusClient, FlightSearchQuery, FlightSearchResult, LocationSuggestion};
use error::ApiError;
use serde::Serialize;

#[tauri::command]
async fn search_flights(
    state: tauri::State<'_, AmadeusClient>,
    query: FlightSearchQuery,
) -> Result<FlightSearchResult, ApiError> {
    state.search_flights(&query).await
}

#[tauri::command]
async fn search_locations(
    state: tauri::State<'_, AmadeusClient>,
    keyword: String,
) -> Result<Vec<LocationSuggestion>, ApiError> {
    state.search_locations(&keyword).await
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BackendStatus {
    amadeus_configured: bool,
    amadeus_environment: String,
    version: String,
}

#[tauri::command]
fn backend_status(state: tauri::State<'_, AmadeusClient>) -> BackendStatus {
    BackendStatus {
        amadeus_configured: state.is_configured(),
        amadeus_environment: state.environment().to_owned(),
        version: env!("CARGO_PKG_VERSION").to_owned(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Best-effort .env loading for local development; production builds read
    // real environment variables.
    let _ = dotenvy::dotenv();

    tauri::Builder::default()
        .manage(AmadeusClient::from_env())
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
