/** AI travel journal domain types (Claude Vision — roadmap weeks 11-12). */

export interface JournalEntry {
  id: string;
  tripId: string;
  ownerId: string;
  /** Day of trip the entry covers (1-based), if day-scoped. */
  day?: number | null;
  title: string;
  /** User-written notes, if any. */
  userNotes?: string | null;
  /** AI-synthesized narrative built from photos + notes + itinerary. */
  aiNarrative?: string | null;
  /** Photo IDs the narrative was synthesized from. */
  photoIds: string[];
  /** Model used for synthesis, e.g. "claude-sonnet-5". */
  model?: string | null;
  status: "draft" | "generating" | "ready" | "error";
  createdAt: string;
  updatedAt: string;
}
