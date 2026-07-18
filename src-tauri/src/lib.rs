mod ai;
mod demo;
mod duffel;
mod error;
mod liteapi;
mod mcp;
mod tools;
mod types;

use std::sync::Arc;

use duffel::DuffelClient;
use error::ApiError;
use liteapi::LiteApiClient;
use serde::Serialize;
use types::{
    FlightSearchQuery, FlightSearchResult, HotelSearchQuery, HotelSearchResult, LocationSuggestion,
};

#[tauri::command]
async fn search_flights(
    state: tauri::State<'_, Arc<DuffelClient>>,
    query: FlightSearchQuery,
) -> Result<FlightSearchResult, ApiError> {
    state.search_flights(&query).await
}

#[tauri::command]
async fn search_locations(
    state: tauri::State<'_, Arc<DuffelClient>>,
    keyword: String,
) -> Result<Vec<LocationSuggestion>, ApiError> {
    state.search_locations(&keyword).await
}

#[tauri::command]
async fn search_hotels(
    state: tauri::State<'_, Arc<LiteApiClient>>,
    query: HotelSearchQuery,
) -> Result<HotelSearchResult, ApiError> {
    state.search_hotels(&query).await
}

#[tauri::command]
async fn ai_chat(
    state: tauri::State<'_, tools::ToolContext>,
    request: ai::ChatRequest,
    on_event: tauri::ipc::Channel<ai::ChatEvent>,
) -> Result<ai::ChatReply, String> {
    ai::chat(&state, request, on_event).await
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
    /// Local MCP endpoint AI clients can connect to.
    mcp_endpoint: String,
    version: String,
}

#[tauri::command]
fn backend_status(
    flights: tauri::State<'_, Arc<DuffelClient>>,
    hotels: tauri::State<'_, Arc<LiteApiClient>>,
) -> BackendStatus {
    BackendStatus {
        flights_provider: "duffel".to_owned(),
        flights_configured: flights.is_configured(),
        environment: flights.environment().to_owned(),
        hotels_provider: "liteapi".to_owned(),
        hotels_configured: hotels.is_configured(),
        hotels_environment: hotels.environment().to_owned(),
        mcp_endpoint: mcp::endpoint(),
        version: env!("CARGO_PKG_VERSION").to_owned(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Best-effort .env loading for local development; production builds read
    // real environment variables.
    let _ = dotenvy::dotenv();

    let flights = Arc::new(DuffelClient::from_env());
    let hotels = Arc::new(LiteApiClient::from_env());
    let context = tools::ToolContext {
        flights: flights.clone(),
        hotels: hotels.clone(),
    };
    let mcp_state = context.clone();

    tauri::Builder::default()
        .manage(flights)
        .manage(hotels)
        .manage(context)
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            // Background MCP server: lets external AI clients (Claude,
            // ChatGPT, Grok, Kimi, …) use Marco Polo's travel search.
            tauri::async_runtime::spawn(mcp::serve(mcp_state));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            search_flights,
            search_locations,
            search_hotels,
            ai_chat,
            backend_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
