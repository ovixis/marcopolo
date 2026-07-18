/**
 * Flight search domain types.
 * These mirror the Rust types in `src-tauri/src/amadeus.rs` — keep in sync.
 */

export type TravelClass = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";

export interface FlightSearchQuery {
  /** 3-letter IATA code, e.g. "JFK" */
  origin: string;
  /** 3-letter IATA code, e.g. "LHR" */
  destination: string;
  /** ISO date, e.g. "2026-08-01" */
  departureDate: string;
  /** ISO date; omit for one-way trips */
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  travelClass?: TravelClass;
  nonStop?: boolean;
  /** ISO 4217 currency code, defaults to USD */
  currency?: string;
}

export interface FlightSearchResult {
  offers: FlightOffer[];
  currency: string;
  /** True when results are generated locally because no API key is configured. */
  demo: boolean;
}

export interface FlightOffer {
  id: string;
  /** Decimal string as returned by the API, e.g. "412.50" */
  totalPrice: string;
  currency: string;
  itineraries: FlightItinerary[];
  validatingAirline?: string | null;
  seatsRemaining?: number | null;
}

export interface FlightItinerary {
  /** ISO-8601 duration, e.g. "PT11H35M" */
  duration: string;
  stops: number;
  segments: FlightSegment[];
}

export interface FlightSegment {
  departure: FlightPoint;
  arrival: FlightPoint;
  carrierCode: string;
  carrierName?: string | null;
  flightNumber: string;
  duration?: string | null;
  aircraft?: string | null;
}

export interface FlightPoint {
  iataCode: string;
  terminal?: string | null;
  /** Local datetime, e.g. "2026-08-01T09:35:00" */
  at: string;
}

export interface LocationSuggestion {
  iataCode: string;
  name: string;
  city?: string | null;
  country?: string | null;
  kind: "AIRPORT" | "CITY" | string;
}
