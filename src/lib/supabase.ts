/**
 * Supabase client (auth, database, storage).
 *
 * Configure via env vars (see `.env.example`):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * The client is optional at this stage — features that need it (photos,
 * journal, agent messaging) check `isSupabaseConfigured()` and degrade
 * gracefully when it is absent.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

export function getSupabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).",
    );
  }
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        // Desktop app: keep the session in localStorage inside the webview.
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return client;
}

/** Name of the storage bucket that holds trip photos. */
export const TRIP_PHOTOS_BUCKET = "trip-photos";
