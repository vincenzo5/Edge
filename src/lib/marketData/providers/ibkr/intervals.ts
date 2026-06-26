import type { Interval, Range } from "@/lib/chart/contracts";

/** Map Edge chart interval to IBKR history `bar` parameter. */
export function mapIbkrBar(interval: Interval): string {
  switch (interval) {
    case "1m":
      return "1min";
    case "5m":
      return "5mins";
    case "15m":
      return "15mins";
    case "30m":
      return "30mins";
    case "1h":
      return "1h";
    case "2h":
      return "2h";
    case "1d":
      return "1d";
    case "1wk":
      return "1w";
    case "1mo":
      return "1m";
    default:
      return "1d";
  }
}

/** Map Edge range preset to IBKR history `period` parameter. */
export function mapIbkrPeriod(range: Range): string {
  switch (range) {
    case "1d":
      return "1d";
    case "5d":
      return "5d";
    case "1mo":
      return "1m";
    case "3mo":
      return "3m";
    case "6mo":
      return "6m";
    case "1y":
      return "1y";
    case "2y":
      return "2y";
    case "5y":
      return "5y";
    case "ytd":
      return "1y";
    case "max":
      return "10y";
    default:
      return "1m";
  }
}
