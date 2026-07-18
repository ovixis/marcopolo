import { Hotel } from "lucide-react";

import { ComingSoon } from "@/components/coming-soon";

export default function HotelsPage() {
  return (
    <ComingSoon
      icon={Hotel}
      title="Hotel Search"
      description="Compare stays across thousands of properties via the Booking.com affiliate API."
      phase="Weeks 5-8"
      planned={[
        "Destination search with check-in/check-out dates and room configuration",
        "Filters for price, star rating, guest score, and amenities",
        "Map view of results",
        "One-click add to your trip itinerary and budget",
      ]}
    />
  );
}
