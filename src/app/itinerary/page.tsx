import { CalendarRange } from "lucide-react";

import { ComingSoon } from "@/components/coming-soon";

export default function ItineraryPage() {
  return (
    <ComingSoon
      icon={<CalendarRange className="size-8" aria-hidden />}
      title="Itinerary Builder"
      leadIn="Day by day, chart the course."
      description="Plan every day of your trip on a drag-and-drop timeline — flights, stays, and experiences in one place."
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
