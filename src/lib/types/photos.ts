/** Photo gallery domain types (Supabase Storage — roadmap weeks 11-12). */

export interface TripPhoto {
  id: string;
  tripId: string;
  ownerId: string;
  /** Path inside the `trip-photos` storage bucket. */
  storagePath: string;
  /** Signed or public URL resolved at display time. */
  url?: string | null;
  caption?: string | null;
  takenAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  width?: number | null;
  height?: number | null;
  /** Bytes */
  sizeBytes?: number | null;
  createdAt: string;
}
