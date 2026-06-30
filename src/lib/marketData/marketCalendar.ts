/** US regular session close in UTC (4pm ET during standard time). */
export const US_MARKET_CLOSE_UTC_HOUR = 20;

/** ISO date YYYY-MM-DD in UTC. */
export function formatUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
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

/** Latest US trading day with a completed daily bar (never today before market close). */
export function latestCompletedTradingDate(now = new Date()): string {
  const cursor = new Date(now);
  if (!isUsMarketClosed(cursor)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  walkBackWeekends(cursor);
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
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.push(formatUtcDate(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return dates;
}
