/** Hotel search domain types (Booking.com integration — roadmap weeks 5-8). */

export interface HotelSearchQuery {
  /** Free-text destination, e.g. "Lisbon" */
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
  rooms: number;
  currency?: string;
}

export interface HotelOffer {
  id: string;
  name: string;
  address: string;
  city: string;
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
  amenities: string[];
  freeCancellation: boolean;
}
