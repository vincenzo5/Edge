import type { Interval, Range } from "@/lib/chart/contracts";

/** Map Edge chart interval to TWS/IB historical bar size. */
export function mapTwsBarSize(interval: Interval): string {
  switch (interval) {
    case "1m":
      return "1 min";
    case "5m":
      return "5 mins";
    case "15m":
      return "15 mins";
    case "30m":
      return "30 mins";
    case "1h":
      return "1 hour";
    case "2h":
      return "2 hours";
    case "1d":
      return "1 day";
    case "1wk":
      return "1 week";
    case "1mo":
      return "1 month";
    default:
      return "1 day";
  }
}

/** Map Edge range preset to TWS historical duration. */
export function mapTwsDuration(range: Range): string {
  switch (range) {
    case "1d":
      return "1 D";
    case "5d":
      return "5 D";
    case "1mo":
      return "1 M";
    case "3mo":
      return "3 M";
    case "6mo":
      return "6 M";
    case "1y":
      return "1 Y";
    case "2y":
      return "2 Y";
    case "5y":
      return "5 Y";
    case "ytd":
      return "1 Y";
    case "max":
      return "10 Y";
    default:
      return "1 M";
  }
}
