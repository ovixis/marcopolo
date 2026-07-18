/** Small display formatters shared across the app. */

/** Parse an ISO-8601 duration like "PT11H35M" into minutes. */
export function durationToMinutes(iso: string): number {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(iso);
  if (!match) return 0;
  return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
}

/** "PT11H35M" → "11h 35m" */
export function formatDuration(iso: string): string {
  const minutes = durationToMinutes(iso);
  if (minutes === 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** "2026-08-01T09:35:00" → "09:35" */
export function formatTime(localDateTime: string): string {
  return localDateTime.slice(11, 16) || "—";
}

/** "2026-08-01T09:35:00" → "Aug 1" */
export function formatDateShort(localDateTime: string): string {
  const date = new Date(localDateTime.slice(0, 10) + "T00:00:00");
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** ("412.50", "USD") → "$412.50" (falls back to plain concatenation). */
export function formatMoney(amount: string, currency: string): string {
  const value = Number(amount);
  if (Number.isNaN(value)) return `${amount} ${currency}`;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** "QANTAS AIRWAYS" → "Qantas Airways" (leaves mixed-case names alone). */
export function titleCaseIfShouty(name: string): string {
  if (name !== name.toUpperCase()) return name;
  return name
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/** Days from today as an ISO date string (local time). */
export function isoDateFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}
