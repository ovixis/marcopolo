import { Ticket } from "lucide-react";

import { ComingSoon } from "@/components/coming-soon";

export default function ExperiencesPage() {
  return (
    <ComingSoon
      icon={<Ticket className="size-8" aria-hidden />}
      title="Experiences"
      leadIn="What shall we do once we arrive?"
      description="Tours, day trips, food crawls, and activities — pulled live via the Viator partner API."
      phase="Weeks 5-8"
      planned={[
        "Search by destination and date with category filters",
        "Ratings, reviews, and free-cancellation flags",
        "Duration-aware suggestions that fit gaps in your itinerary",
        "One-click add to itinerary and budget",
      ]}
    />
  );
}
