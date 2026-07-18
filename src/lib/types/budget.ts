/** Budget tracking domain types (roadmap weeks 9-10). */

export type ExpenseCategory =
  | "flights"
  | "lodging"
  | "food"
  | "activities"
  | "transport"
  | "shopping"
  | "other";

export interface Expense {
  id: string;
  tripId: string;
  category: ExpenseCategory;
  description: string;
  /** Decimal string in the expense currency. */
  amount: string;
  currency: string;
  /** Amount converted to the trip currency at `exchangeRate`. */
  amountInTripCurrency: string;
  exchangeRate?: number | null;
  date: string;
  /** Optional link back to the itinerary item this expense came from. */
  itineraryItemId?: string | null;
  createdAt: string;
}

export interface BudgetSummary {
  tripId: string;
  currency: string;
  /** Planned budget total set by the user. */
  budgetTotal: string;
  /** Sum of all expenses. */
  spentTotal: string;
  byCategory: Record<ExpenseCategory, string>;
}
