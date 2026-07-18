/**
 * Static sample data used only when the UI runs outside Tauri (plain browser
 * dev server). The desktop app's demo mode lives in `src-tauri/src/demo.rs`.
 */
import type {
  FlightOffer,
  FlightSearchQuery,
  FlightSearchResult,
  LocationSuggestion,
} from "./types";

const SAMPLE_AIRPORTS: LocationSuggestion[] = [
  { iataCode: "JFK", name: "John F. Kennedy International", city: "New York", country: "United States", kind: "AIRPORT" },
  { iataCode: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "United States", kind: "AIRPORT" },
  { iataCode: "LHR", name: "Heathrow", city: "London", country: "United Kingdom", kind: "AIRPORT" },
  { iataCode: "CDG", name: "Charles de Gaulle", city: "Paris", country: "France", kind: "AIRPORT" },
  { iataCode: "SIN", name: "Changi", city: "Singapore", country: "Singapore", kind: "AIRPORT" },
  { iataCode: "NRT", name: "Narita International", city: "Tokyo", country: "Japan", kind: "AIRPORT" },
  { iataCode: "SYD", name: "Kingsford Smith", city: "Sydney", country: "Australia", kind: "AIRPORT" },
  { iataCode: "DXB", name: "Dubai International", city: "Dubai", country: "United Arab Emirates", kind: "AIRPORT" },
];

export function webFallbackLocations(keyword: string): LocationSuggestion[] {
  const needle = keyword.trim().toLowerCase();
  if (needle.length < 2) return [];
  return SAMPLE_AIRPORTS.filter(
    (a) =>
      a.iataCode.toLowerCase().startsWith(needle) ||
      a.name.toLowerCase().includes(needle) ||
      (a.city ?? "").toLowerCase().includes(needle),
  );
}

export function webFallbackFlights(
  query: FlightSearchQuery,
): FlightSearchResult {
  const origin = query.origin.toUpperCase();
  const destination = query.destination.toUpperCase();
  const date = query.departureDate;
  const currency = query.currency ?? "USD";

  const offer = (
    id: string,
    carrierCode: string,
    carrierName: string,
    departHour: number,
    hours: number,
    price: string,
  ): FlightOffer => {
    const arriveHour = (departHour + hours) % 24;
    const two = (n: number) => String(n).padStart(2, "0");
    return {
      id,
      totalPrice: price,
      currency,
      validatingAirline: carrierName,
      seatsRemaining: 5,
      itineraries: [
        {
          duration: `PT${hours}H`,
          stops: 0,
          segments: [
            {
              departure: { iataCode: origin, at: `${date}T${two(departHour)}:00:00` },
              arrival: { iataCode: destination, at: `${date}T${two(arriveHour)}:00:00` },
              carrierCode,
              carrierName,
              flightNumber: "101",
              duration: `PT${hours}H`,
              aircraft: "Airbus A350-900",
            },
          ],
        },
      ],
    };
  };

  return {
    currency,
    demo: true,
    offers: [
      offer("web-1", "BA", "British Airways", 8, 7, "420.00"),
      offer("web-2", "AF", "Air France", 11, 8, "365.00"),
      offer("web-3", "DL", "Delta Air Lines", 17, 7, "489.00"),
    ],
  };
}
