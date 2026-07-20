import { BookOpen } from "lucide-react";

import { ComingSoon } from "@/components/coming-soon";

export default function JournalPage() {
  return (
    <ComingSoon
      icon={<BookOpen className="size-8" aria-hidden />}
      title="AI Travel Journal"
      leadIn="Every journey deserves a chronicle."
      description="Photos and notes become a written trip story — scenes, meals, and places, drafted for you to edit."
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
