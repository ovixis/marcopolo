/**
 * Hotel search domain types (LiteAPI / Nuitee).
 * These mirror the Rust types in `src-tauri/src/types.rs` — keep in sync.
 */

export interface HotelSearchQuery {
  /** City name, e.g. "Rome" */
  city: string;
  /** ISO 3166-1 alpha-2, e.g. "IT" */
  countryCode: string;
  /** ISO date */
  checkIn: string;
  /** ISO date */
  checkOut: string;
  adults: number;
  children?: number;
  rooms: number;
  /** ISO 4217, defaults to USD */
  currency?: string;
}

export interface HotelSearchResult {
  offers: HotelOffer[];
  currency: string;
  /** True when results are generated locally because no API key is configured. */
  demo: boolean;
}

export interface HotelOffer {
  id: string;
  name: string;
  address: string;
  city: string;
  /** ISO country code, uppercase */
  country: string;
  /** 1-5 */
  starRating?: number | null;
  /** 0-10 guest review score */
  reviewScore?: number | null;
  reviewCount?: number | null;
  /** Total stay price as decimal string */
  totalPrice: string;
  currency: string;
  photoUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Cheapest room's name, e.g. "Superior Double Room" */
  roomName?: string | null;
  /** Board for that rate, e.g. "Room Only", "Breakfast Included" */
  boardName?: string | null;
  freeCancellation: boolean;
}
