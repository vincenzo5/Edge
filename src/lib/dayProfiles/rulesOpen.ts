import type { OpenType } from "./types";
import type { OhlcBar } from "./rules";

const NY_TIME_ZONE = "America/New_York";

/** Yahoo chart candles use unix seconds in `timestamp`. */
export function etDate(tsSec: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(tsSec * 1000));
}

export function etTime(tsSec: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(tsSec * 1000));
}

/** Keep regular session bars (9:30–16:00 ET) for a session date. */
export function rthBars(candles: OhlcBar[], date: string): OhlcBar[] {
  return candles.filter((c) => {
    if (etDate(c.timestamp) !== date) return false;
    const t = etTime(c.timestamp);
    return t >= "09:30" && t < "16:00";
  });
}

/** Classify L2 open type from first ~90m (18×5m bars). */
export function classifyOpenType(bars: OhlcBar[]): OpenType {
  if (bars.length < 6) return "open_unknown";

  const open = bars[0]!.open;
  const window = bars.slice(0, Math.min(18, bars.length));
  const firstThird = window.slice(0, 6);

  const dayHigh = Math.max(...window.map((b) => b.high));
  const dayLow = Math.min(...window.map((b) => b.low));
  const range = dayHigh - dayLow;
  if (!(range > 0)) return "open_unknown";

  const close90 = window[window.length - 1]!.close;
  const netMove = close90 - open;
  const netPct = netMove / open;

  const firstLow = Math.min(...firstThird.map((b) => b.low));
  const firstHigh = Math.max(...firstThird.map((b) => b.high));
  const probeDown = open - firstLow;
  const probeUp = firstHigh - open;

  const ibRange = firstHigh - firstLow;
  const ibPct = ibRange / open;

  if (ibPct < 0.003 && Math.abs(netPct) < 0.004) return "open_auction";

  const bullishDay = netMove >= 0;

  const firstClose = firstThird[firstThird.length - 1]!.close;
  const earlyUp = firstClose > open * 1.001;
  const earlyDown = firstClose < open * 0.999;
  if (earlyUp && close90 < open * 0.999) return "open_rejection_reverse";
  if (earlyDown && close90 > open * 1.001) return "open_rejection_reverse";

  if (bullishDay && probeDown > range * 0.25 && netMove > range * 0.35) return "open_test_drive";
  if (!bullishDay && probeUp > range * 0.25 && netMove < -range * 0.35) return "open_test_drive";

  if (bullishDay && probeDown < range * 0.15 && netMove > range * 0.4) return "open_drive";
  if (!bullishDay && probeUp < range * 0.15 && netMove < -range * 0.4) return "open_drive";

  if (Math.abs(netPct) < 0.005 && ibPct < 0.006) return "open_auction";

  if (Math.abs(netMove) > range * 0.25) {
    return probeDown > range * 0.2 || probeUp > range * 0.2 ? "open_test_drive" : "open_drive";
  }

  return "open_auction";
}
