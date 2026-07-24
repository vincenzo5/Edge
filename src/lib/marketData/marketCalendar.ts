/** US regular session close in UTC (4pm ET during standard time). */
export const US_MARKET_CLOSE_UTC_HOUR = 20;

/** ISO date YYYY-MM-DD in UTC. */
export function formatUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** ISO date YYYY-MM-DD in America/New_York. */
export function formatNyDate(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  let year = "1970";
  let month = "01";
  let day = "01";
  for (const part of parts) {
    if (part.type === "year") year = part.value;
    if (part.type === "month") month = part.value;
    if (part.type === "day") day = part.value;
  }
  return `${year}-${month}-${day}`;
}

/** Recurring NYSE full-day closures (observed dates through 2028). Expand as needed. */
const NYSE_FULL_DAY_HOLIDAYS = new Set<string>([
  // 2025
  "2025-01-01",
  "2025-01-20",
  "2025-02-17",
  "2025-04-18",
  "2025-05-26",
  "2025-06-19",
  "2025-07-04",
  "2025-09-01",
  "2025-11-27",
  "2025-12-25",
  // 2026
  "2026-01-01",
  "2026-01-19",
  "2026-02-16",
  "2026-04-03",
  "2026-05-25",
  "2026-06-19",
  "2026-07-03",
  "2026-09-07",
  "2026-11-26",
  "2026-12-25",
  // 2027
  "2027-01-01",
  "2027-01-18",
  "2027-02-15",
  "2027-03-26",
  "2027-05-31",
  "2027-06-18",
  "2027-07-05",
  "2027-09-06",
  "2027-11-25",
  "2027-12-24",
  // 2028
  "2028-01-17",
  "2028-02-21",
  "2028-04-14",
  "2028-05-29",
  "2028-06-19",
  "2028-07-04",
  "2028-09-04",
  "2028-11-23",
  "2028-12-25",
]);

/** True when NYSE is closed for a full trading day (weekends excluded). */
export function isNyseFullDayHoliday(now = new Date()): boolean {
  return NYSE_FULL_DAY_HOLIDAYS.has(formatNyDate(now));
}

/** True when the US equity session for the UTC calendar day has closed. */
export function isUsMarketClosed(now = new Date()): boolean {
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;
  return now.getUTCHours() >= US_MARKET_CLOSE_UTC_HOUR;
}

function walkBackWeekends(cursor: Date): void {
  while (cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
}

function walkBackTradingDays(cursor: Date): void {
  while (
    cursor.getUTCDay() === 0 ||
    cursor.getUTCDay() === 6 ||
    isNyseFullDayHoliday(cursor)
  ) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
}

/** Latest US trading day with a completed daily bar (never today before market close). */
export function latestCompletedTradingDate(now = new Date()): string {
  const cursor = new Date(now);
  if (!isUsMarketClosed(cursor)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  walkBackWeekends(cursor);
  walkBackTradingDays(cursor);
  return formatUtcDate(cursor);
}

/** Walk backward over weekdays to collect completed trading dates. */
export function recentTradingDays(count: number, fromDate = new Date()): string[] {
  const dates: string[] = [];
  const cursor = new Date(fromDate);
  if (!isUsMarketClosed(cursor)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (dates.length < count) {
    walkBackWeekends(cursor);
    walkBackTradingDays(cursor);
    dates.push(formatUtcDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return dates;
}
