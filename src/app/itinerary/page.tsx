import { CalendarRange } from "lucide-react";

import { ComingSoon } from "@/components/coming-soon";

export default function ItineraryPage() {
  return (
    <ComingSoon
      icon={CalendarRange}
      title="Itinerary Builder"
      description="Plan every day of your trip with a drag-and-drop timeline."
      phase="Weeks 9-10"
      planned={[
        "Day-by-day columns with drag-and-drop reordering",
        "Flights, hotels, and experiences drop straight in from search results",
        "Notes, restaurants, and transport blocks",
        "Costs roll up automatically into the budget tracker",
      ]}
    />
  );
}
