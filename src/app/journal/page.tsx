import { BookOpen } from "lucide-react";

import { ComingSoon } from "@/components/coming-soon";

export default function JournalPage() {
  return (
    <ComingSoon
      icon={BookOpen}
      title="AI Travel Journal"
      description="Claude Vision reads your photos and notes, then writes your trip story."
      phase="Weeks 11-12"
      planned={[
        "Per-day entries synthesized from photos, notes, and the itinerary",
        "Claude Vision describes scenes, food, and places it recognizes",
        "Edit and regenerate drafts before saving",
        "Export a whole trip as a beautifully formatted story",
      ]}
    />
  );
}
