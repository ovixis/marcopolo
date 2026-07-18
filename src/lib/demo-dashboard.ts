/**
 * Demo data for the overview dashboard. Everything here is sample content —
 * it will be replaced by real trips/bookings once Supabase persistence lands
 * (see the roadmap in README). Keeping it static and deterministic makes the
 * dashboard fully explorable in demo mode, like every other feature.
 */

export const demoTrip = {
  title: "Kyoto & Osaka",
  dateRange: "Aug 17 – 26, 2026",
  daysToDeparture: 30,
  travelers: 2,
  budgetTotal: 4500,
  budgetSpent: 2835,
  currency: "USD",
};

/** Cumulative trip spending by month (planning phase). */
export const spendSeries = [
  { label: "Jan", value: 0 },
  { label: "Feb", value: 120 },
  { label: "Mar", value: 480 },
  { label: "Apr", value: 1210 },
  { label: "May", value: 1620 },
  { label: "Jun", value: 2140 },
  { label: "Jul", value: 2835 },
];

/**
 * Chart palette — validated colorblind-safe on the deep-navy dashboard surface
 * (and on white for the light theme). cyan / violet / amber.
 */
export const chartColors = {
  primary: "#0891B2", // cyan — main series / "ready"
  processing: "#8B5CF6", // violet — in progress
  attention: "#D97706", // amber — needs action
};

/**
 * Great-circle routes drawn on the dashboard globe. `active` marks the
 * upcoming trip (rendered brighter, with a travelling light).
 * [lat, lng] pairs.
 */
export const globeRoutes = [
  { from: [40.71, -74.01], to: [35.68, 139.69], active: true }, // New York → Tokyo (next)
  { from: [38.72, -9.14], to: [40.71, -74.01], active: false }, // Lisbon → New York
  { from: [41.9, 12.5], to: [13.76, 100.5], active: false }, // Rome → Bangkok
  { from: [51.51, -0.13], to: [38.72, -9.14], active: false }, // London → Lisbon
  { from: [35.68, 139.69], to: [-33.87, 151.21], active: false }, // Tokyo → Sydney
] as const;

/** City markers to glow on the globe. [lat, lng]. */
export const globeCities = [
  [40.71, -74.01],
  [35.68, 139.69],
  [38.72, -9.14],
  [41.9, 12.5],
  [13.76, 100.5],
  [51.51, -0.13],
  [-33.87, 151.21],
] as const;

export type DocStatus = "ready" | "processing" | "action";

export const travelDocs = {
  readyPct: 72,
  segments: [
    { label: "Ready", pct: 72, count: 5, status: "ready" as DocStatus },
    { label: "Processing", pct: 18, count: 1, status: "processing" as DocStatus },
    { label: "Needs action", pct: 10, count: 1, status: "action" as DocStatus },
  ],
};

export const readinessItems = [
  { label: "Flights booked", status: "done" },
  { label: "Hotels booked", status: "done" },
  { label: "Rail pass purchased", status: "done" },
  { label: "Visa application", status: "processing" },
  { label: "Travel insurance", status: "todo" },
  { label: "eSIM / connectivity", status: "todo" },
] as const;

export const recentBookings = [
  {
    kind: "flight",
    title: "JL 6 · JFK → NRT",
    detail: "Japan Airlines · nonstop",
    date: "Aug 17",
    amount: "$1,240",
    status: "confirmed",
  },
  {
    kind: "hotel",
    title: "Hotel Kanra",
    detail: "Kyoto · 5 nights",
    date: "Aug 18",
    amount: "$980",
    status: "confirmed",
  },
  {
    kind: "experience",
    title: "teamLab Planets",
    detail: "Tokyo · 2 tickets",
    date: "Aug 24",
    amount: "$58",
    status: "pending",
  },
  {
    kind: "transport",
    title: "JR Pass · 7 days",
    detail: "2 travelers",
    date: "Aug 18",
    amount: "$412",
    status: "confirmed",
  },
  {
    kind: "experience",
    title: "Kaiseki cooking class",
    detail: "Kyoto · Gion",
    date: "Aug 20",
    amount: "$145",
    status: "pending",
  },
] as const;

export const recentActivity = [
  {
    icon: "plane",
    text: "Flight JL 6 confirmed",
    meta: "2 hours ago · Booking #4821",
  },
  {
    icon: "wallet",
    text: "Added expense: JR Pass $412",
    meta: "Yesterday · Transport",
  },
  {
    icon: "camera",
    text: "12 photos uploaded to Lisbon trip",
    meta: "2 days ago · Gallery",
  },
  {
    icon: "book",
    text: "Journal draft ready: Lisbon, Day 3",
    meta: "3 days ago · AI Journal",
  },
] as const;
