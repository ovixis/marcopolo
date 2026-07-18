import { Wallet } from "lucide-react";

import { ComingSoon } from "@/components/coming-soon";

export default function BudgetPage() {
  return (
    <ComingSoon
      icon={Wallet}
      title="Budget Tracker"
      description="Real-time trip costs, by category and by day."
      phase="Weeks 9-10"
      planned={[
        "Set a total budget per trip and watch remaining balance live",
        "Automatic expenses from booked flights, hotels, and experiences",
        "Manual expenses with multi-currency support and conversion",
        "Category breakdown charts (flights, lodging, food, activities…)",
      ]}
    />
  );
}
