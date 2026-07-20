/**
 * Static sample data used only when the UI runs outside Tauri (plain browser
 * dev server). The desktop app's demo mode lives in `src-tauri/src/demo.rs`.
 */
import type { CliAgent, LocalRuntime } from "./tauri";

/**
 * Sample CLI-agent detection for the browser preview: pretend Claude Code is
 * installed so the "use your subscription" flow is developable without Tauri.
 */
export function webFallbackCliAgents(): CliAgent[] {
  return [
    { id: "claude-code", label: "Claude Code", bin: "claude", installed: true, path: "/opt/homebrew/bin/claude" },
    { id: "codex", label: "Codex", bin: "codex", installed: false, path: "" },
    { id: "gemini-cli", label: "Gemini CLI", bin: "gemini", installed: false, path: "" },
  ];
}
import type {
  FlightOffer,
  FlightSearchQuery,
  FlightSearchResult,
  HotelOffer,
  HotelSearchQuery,
  HotelSearchResult,
  LocationSuggestion,
} from "./types";

/**
 * Sample local-model detection for the browser preview: pretend Ollama is up
 * so the "On this device" connector flow is developable without Tauri.
 */
export function webFallbackLocalRuntimes(): LocalRuntime[] {
  return [
    {
      id: "ollama",
      label: "Ollama",
      baseUrl: "http://localhost:11434/v1",
      running: true,
      models: ["llama3.1:8b", "qwen2.5:14b"],
      setupHint: "Install from ollama.com, then: ollama pull llama3.1",
    },
    {
      id: "lmstudio",
      label: "LM Studio",
      baseUrl: "http://localhost:1234/v1",
      running: false,
      models: [],
      setupHint: "LM Studio → Developer → Start Server",
    },
    {
      id: "jan",
      label: "Jan",
      baseUrl: "http://localhost:1337/v1",
      running: false,
      models: [],
      setupHint: "Jan → Settings → Local API Server → Start Server",
    },
    {
      id: "llamacpp",
      label: "llama.cpp",
      baseUrl: "http://localhost:8080/v1",
      running: false,
      models: [],
      setupHint: "llama-server -m your-model.gguf",
    },
  ];
}

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

export function webFallbackHotels(query: HotelSearchQuery): HotelSearchResult {
  const currency = query.currency ?? "USD";
  const city = query.city.trim() || "Sample City";
  const hotel = (
    id: string,
    name: string,
    stars: number,
    score: number,
    price: string,
    freeCancellation: boolean,
  ): HotelOffer => ({
    id,
    name: name.replace("{}", city),
    address: "12 Explorer Street",
    city,
    country: query.countryCode.toUpperCase(),
    starRating: stars,
    reviewScore: score,
    reviewCount: 1200,
    totalPrice: price,
    currency,
    roomName: "Double Room",
    boardName: "Room Only",
    freeCancellation,
  });

  return {
    currency,
    demo: true,
    offers: [
      hotel("web-h1", "Grand {} Palace", 5, 9.1, "540.00", true),
      hotel("web-h2", "The {} House", 4, 8.8, "360.00", true),
      hotel("web-h3", "Old Town {} Inn", 3, 7.9, "220.00", false),
    ],
  };
}
