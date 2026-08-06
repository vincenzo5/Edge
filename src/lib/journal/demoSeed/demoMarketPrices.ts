import { getChartCandlesInPeriod } from "@/lib/yahooFinance";

import { DEMO_JOURNAL_SYMBOLS } from "@/lib/journal/demoSeed/demoSeedConstants";

export type DemoDailyBar = {
  open: number;
  high: number;
  low: number;
  close: number;
};

/** symbol → YYYY-MM-DD → bar */
export type DemoPriceBook = Map<string, Map<string, DemoDailyBar>>;

export function dateKeyUtc(day: Date): string {
  return day.toISOString().slice(0, 10);
}

/** Last completed US equity session (yesterday, skipping weekends). */
export function defaultDemoEndDate(now = new Date()): Date {
  const d = new Date(now);
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d;
}

export function lookupDemoBar(
  priceBook: DemoPriceBook,
  symbol: string,
  day: Date,
): DemoDailyBar | null {
  return priceBook.get(symbol)?.get(dateKeyUtc(day)) ?? null;
}

function candleToBar(candle: {
  open: number;
  high: number;
  low: number;
  close: number;
}): DemoDailyBar {
  return {
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  };
}

export async function fetchDemoPriceBook(input: {
  endDate: Date;
  lookbackCalendarDays?: number;
  symbols?: readonly string[];
}): Promise<DemoPriceBook> {
  const symbols = input.symbols ?? DEMO_JOURNAL_SYMBOLS.map((row) => row.symbol);
  const lookback = input.lookbackCalendarDays ?? 120;
  const periodEnd = new Date(input.endDate);
  periodEnd.setUTCHours(23, 59, 59, 999);
  const periodStart = new Date(input.endDate);
  periodStart.setUTCDate(periodStart.getUTCDate() - lookback);
  periodStart.setUTCHours(0, 0, 0, 0);

  const book: DemoPriceBook = new Map();

  for (const symbol of symbols) {
    const candles = await getChartCandlesInPeriod(symbol, periodStart, periodEnd, "1d");
    const byDate = new Map<string, DemoDailyBar>();
    for (const candle of candles) {
      byDate.set(dateKeyUtc(new Date(candle.timestamp * 1000)), candleToBar(candle));
    }
    book.set(symbol, byDate);
  }

  return book;
}

/** Intraday-style price from a real daily bar (deterministic from seed). */
export function priceFromDailyBar(
  bar: DemoDailyBar,
  seed: string,
  role: "entry" | "exit",
  direction: "long" | "short",
  isWin: boolean,
): number {
  const t = hash01(seed);
  const range = Math.max(bar.high - bar.low, bar.close * 0.002);

  if (role === "entry") {
    if (direction === "long") {
      return roundCents(bar.low + range * (0.15 + t * 0.35));
    }
    return roundCents(bar.high - range * (0.15 + t * 0.35));
  }

  if (direction === "long") {
    if (isWin) {
      return roundCents(bar.low + range * (0.55 + t * 0.4));
    }
    return roundCents(bar.low + range * (0.05 + t * 0.25));
  }

  if (isWin) {
    return roundCents(bar.high - range * (0.55 + t * 0.4));
  }
  return roundCents(bar.high - range * (0.05 + t * 0.25));
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}
