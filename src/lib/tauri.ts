/**
 * Typed bridge to the Tauri (Rust) backend.
 *
 * When the app runs in a plain browser (`pnpm dev` without Tauri), commands
 * fall back to small static samples so the UI stays developable — the real
 * providers are only reachable through the Rust side.
 */
import { invoke } from "@tauri-apps/api/core";

import type {
  FlightSearchQuery,
  FlightSearchResult,
  HotelSearchQuery,
  HotelSearchResult,
  LocationSuggestion,
} from "./types";
import {
  webFallbackFlights,
  webFallbackHotels,
  webFallbackLocations,
} from "./web-fallback";

export interface BackendStatus {
  flightsProvider: string;
  flightsConfigured: boolean;
  /** "test" | "live" | "demo" (or "browser" in the web preview) */
  environment: string;
  hotelsProvider: string;
  hotelsConfigured: boolean;
  /** "live" | "sandbox" | "demo" */
  hotelsEnvironment: string;
  version: string;
}

export interface BackendError {
  code: "network" | "provider" | "decode" | "invalid_input" | string;
  message: string;
}

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function toBackendError(err: unknown): BackendError {
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as BackendError).message === "string"
  ) {
    return err as BackendError;
  }
  return { code: "unknown", message: String(err) };
}

export async function searchFlights(
  query: FlightSearchQuery,
): Promise<FlightSearchResult> {
  if (!isTauri()) {
    return webFallbackFlights(query);
  }
  return invoke<FlightSearchResult>("search_flights", { query });
}

export async function searchLocations(
  keyword: string,
): Promise<LocationSuggestion[]> {
  if (!isTauri()) {
    return webFallbackLocations(keyword);
  }
  return invoke<LocationSuggestion[]>("search_locations", { keyword });
}

export async function searchHotels(
  query: HotelSearchQuery,
): Promise<HotelSearchResult> {
  if (!isTauri()) {
    return webFallbackHotels(query);
  }
  return invoke<HotelSearchResult>("search_hotels", { query });
}

export async function backendStatus(): Promise<BackendStatus> {
  if (!isTauri()) {
    return {
      flightsProvider: "duffel",
      flightsConfigured: false,
      environment: "browser",
      hotelsProvider: "liteapi",
      hotelsConfigured: false,
      hotelsEnvironment: "browser",
      version: "web-preview",
    };
  }
  return invoke<BackendStatus>("backend_status");
}
