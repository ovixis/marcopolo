import { MessageSquare } from "lucide-react";

import { ComingSoon } from "@/components/coming-soon";

export default function AgentsPage() {
  return (
    <ComingSoon
      icon={MessageSquare}
      title="Travel Agent Connection"
      description="Sometimes you want a human expert. Message vetted travel agents without leaving the app."
      phase="Weeks 13-14"
      planned={[
        "Browse agent profiles by region and specialty",
        "Threaded messaging tied to a specific trip",
        "Share your itinerary with an agent for feedback",
        "Read receipts and attachment support",
      ]}
    />
  );
}
