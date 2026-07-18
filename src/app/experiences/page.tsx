import { Ticket } from "lucide-react";

import { ComingSoon } from "@/components/coming-soon";

export default function ExperiencesPage() {
  return (
    <ComingSoon
      icon={Ticket}
      title="Experiences"
      description="Tours, day trips, food crawls, and activities via the Viator partner API."
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
