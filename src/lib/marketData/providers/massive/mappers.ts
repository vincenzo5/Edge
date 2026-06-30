import type { EquityCandle } from "../../contracts/equities";
import type { FmpScreenerRow } from "../../contracts/fmp";
import type {
  MassiveGroupedBar,
  MassiveSnapshotTicker,
} from "../../contracts/massive";
import { asFiniteNumber, asNonEmptyString } from "../../validation/parseRequest";

/** Map grouped-daily or custom-bar row to Edge candle contract. */
export function mapMassiveGroupedBarToEquityCandle(
  bar: MassiveGroupedBar,
  options: { symbol?: string; fallbackTimestampMs?: number } = {},
): EquityCandle | null {
  const o = asFiniteNumber(bar.o);
  const h = asFiniteNumber(bar.h);
  const l = asFiniteNumber(bar.l);
  const c = asFiniteNumber(bar.c);
  if (o == null || h == null || l == null || c == null) return null;

  const t = asFiniteNumber(bar.t) ?? options.fallbackTimestampMs;
  if (t == null || !Number.isFinite(t)) return null;

  const v = asFiniteNumber(bar.v);
  return {
    t,
    o,
    h,
    l,
    c,
    ...(v != null ? { v } : {}),
  };
}

/** Parse YYYY-MM-DD trading date to UTC midnight ms (used when bar.t absent). */
export function tradingDateToUtcMs(dateStr: string): number {
  return Date.parse(`${dateStr}T00:00:00.000Z`);
}

export function mapMassiveSnapshotToScreenerRow(
  snapshot: MassiveSnapshotTicker,
): FmpScreenerRow | null {
  const symbol = asNonEmptyString(snapshot.ticker)?.toUpperCase();
  if (!symbol) return null;

  const day = snapshot.day;
  const price =
    asFiniteNumber(snapshot.lastTrade?.p) ??
    asFiniteNumber(snapshot.lastQuote?.p) ??
    asFiniteNumber(day?.c);
  const change = asFiniteNumber(snapshot.todaysChange);
  const changePercent = asFiniteNumber(snapshot.todaysChangePerc);
  const volume = asFiniteNumber(day?.v);

  return {
    symbol,
    name: null,
    price,
    change,
    changePercent,
    exchange: null,
    volume,
    sector: null,
    industry: null,
    country: "US",
    beta: null,
    marketCap: null,
    dividendYield: null,
  };
}

/** Index grouped daily bars by symbol for a trading date. */
export function indexGroupedDailyBars(
  bars: MassiveGroupedBar[],
  dateStr: string,
): Map<string, EquityCandle> {
  const fallbackTs = tradingDateToUtcMs(dateStr);
  const bySymbol = new Map<string, EquityCandle>();
  for (const bar of bars) {
    const symbol = asNonEmptyString(bar.T)?.toUpperCase();
    if (!symbol) continue;
    const candle = mapMassiveGroupedBarToEquityCandle(bar, {
      symbol,
      fallbackTimestampMs: fallbackTs,
    });
    if (candle) bySymbol.set(symbol, candle);
  }
  return bySymbol;
}
