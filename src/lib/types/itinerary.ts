/** Trip and itinerary domain types (drag-drop planner — roadmap weeks 9-10). */

export interface Trip {
  id: string;
  ownerId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverPhotoUrl?: string | null;
  /** ISO 4217 */
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export type ItineraryItemKind =
  | "flight"
  | "hotel"
  | "experience"
  | "restaurant"
  | "transport"
  | "note";

export interface ItineraryItem {
  id: string;
  tripId: string;
  kind: ItineraryItemKind;
  title: string;
  /** Day of trip this item belongs to (1-based). */
  day: number;
  /** Sort position within the day (for drag-drop ordering). */
  position: number;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  notes?: string | null;
  /** Cost as decimal string in the trip currency. */
  cost?: string | null;
  /** Raw provider payload (flight offer, hotel offer, ...) for detail views. */
  providerData?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
