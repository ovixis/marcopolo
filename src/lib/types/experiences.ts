/** Experience/activity domain types (Viator integration — roadmap weeks 5-8). */

export interface ExperienceSearchQuery {
  /** Free-text destination, e.g. "Rome" */
  destination: string;
  startDate?: string;
  endDate?: string;
  category?: ExperienceCategory;
  currency?: string;
}

export type ExperienceCategory =
  | "tours"
  | "food_and_drink"
  | "outdoor"
  | "culture"
  | "water"
  | "nightlife"
  | "wellness"
  | "other";

export interface ExperienceOffer {
  id: string;
  title: string;
  description: string;
  category: ExperienceCategory;
  /** e.g. "PT3H" */
  duration?: string | null;
  /** 0-5 */
  rating?: number | null;
  reviewCount?: number | null;
  /** Per-person price as decimal string */
  pricePerPerson: string;
  currency: string;
  photoUrl?: string | null;
  bookingUrl?: string | null;
  freeCancellation: boolean;
}
