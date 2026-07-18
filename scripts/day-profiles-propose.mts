#!/usr/bin/env npx tsx
/**
 * Propose day-profile labels from daily OHLCV (measurable tags + coarse hints).
 * Usage: npx tsx scripts/day-profiles-propose.mts [--days=10]
 *
 * Human still confirms L1/L2. openType is left blank (needs intraday).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getChartCandles, type Candle } from "../src/lib/yahooFinance";

const SYMBOLS = ["SPY", "QQQ", "AAPL", "NVDA", "TSLA"] as const;
const TAPE = new Set(["SPY", "QQQ"]);
const ATR_N = 14;
const VOL_N = 20;

const daysArg = process.argv.find((a) => a.startsWith("--days="));
const LOOKBACK_DAYS = daysArg ? Number.parseInt(daysArg.split("=")[1]!, 10) : 10;

type Row = {
  symbol: string;
  date: string;
  universe: string;
  dayTypeHint: string;
  openType: string;
  gap: string;
  volatility: string;
  participation: string;
  catalyst: string;
  relative: string;
  gapPct: string;
  rangeAtr: string;
  rvol: string;
  closeLoc: string;
  retPct: string;
  spyRetPct: string;
  status: string;
  notes: string;
};

/** Yahoo chart candles use unix seconds in `timestamp`. */
function etDate(tsSec: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(tsSec * 1000));
}

function trueRange(c: Candle, prev: Candle): number {
  return Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close));
}

function atr(candles: Candle[], i: number, n: number): number | null {
  if (i < n) return null;
  let sum = 0;
  for (let k = i - n + 1; k <= i; k++) {
    sum += trueRange(candles[k]!, candles[k - 1]!);
  }
  return sum / n;
}

function smaVolume(candles: Candle[], i: number, n: number): number | null {
  if (i < n - 1) return null;
  let sum = 0;
  let count = 0;
  for (let k = i - n + 1; k <= i; k++) {
    const v = candles[k]!.volume;
    if (v == null || !Number.isFinite(v)) return null;
    sum += v;
    count++;
  }
  return count === n ? sum / n : null;
}

function classifyGap(gapPct: number, open: number, high: number, low: number, close: number, prevClose: number): string {
  if (Math.abs(gapPct) < 0.002) return "gap_none";
  if (gapPct >= 0.002) {
    if (low > prevClose) return "gap_and_go";
    if (close < prevClose) return close < open ? "gap_and_fade" : "gap_fill";
    if (low <= prevClose && high > prevClose) return "gap_partial";
    return "gap_fill";
  }
  // gap down
  if (high < prevClose) return "gap_and_go";
  if (close > prevClose) return close > open ? "gap_and_fade" : "gap_fill";
  if (high >= prevClose && low < prevClose) return "gap_partial";
  return "gap_fill";
}

function classifyVol(rangeAtr: number): string {
  if (rangeAtr >= 2) return "vol_climax";
  if (rangeAtr >= 1.3) return "vol_expand";
  if (rangeAtr <= 0.6) return "vol_contract";
  return "vol_normal";
}

function classifyRvol(rvol: number): string {
  if (rvol >= 1.8) return "rvol_high";
  if (rvol <= 0.7) return "rvol_low";
  return "rvol_normal";
}

function classifyDayHint(closeLoc: number, rangeAtr: number): string {
  if (rangeAtr <= 0.7) return "non_trend";
  if (rangeAtr >= 1.2 && (closeLoc >= 0.8 || closeLoc <= 0.2)) return "trend";
  if (rangeAtr < 1.3 && closeLoc >= 0.35 && closeLoc <= 0.65) return "neutral";
  return "normal";
}

function classifyRelative(ret: number, spyRet: number): string {
  const excess = ret - spyRet;
  if (Math.abs(excess) < 0.003) return "beta_proxy";
  if (excess >= 0.005) return "leader";
  if (excess <= -0.005) return "laggard";
  return "idiosyncratic";
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

async function main() {
  const bySymbol = new Map<string, Candle[]>();
  for (const symbol of SYMBOLS) {
    const candles = await getChartCandles(symbol, "6mo", "1d");
    if (candles.length < VOL_N + LOOKBACK_DAYS + 2) {
      throw new Error(`${symbol}: insufficient daily bars (${candles.length})`);
    }
    bySymbol.set(symbol, candles);
    console.error(`fetched ${symbol}: ${candles.length} daily bars`);
  }

  const spy = bySymbol.get("SPY")!;
  const spyRetByDate = new Map<string, number>();
  for (let i = 1; i < spy.length; i++) {
    const prev = spy[i - 1]!;
    const cur = spy[i]!;
    spyRetByDate.set(etDate(cur.timestamp), (cur.close - prev.close) / prev.close);
  }

  const rows: Row[] = [];
  for (const symbol of SYMBOLS) {
    const candles = bySymbol.get(symbol)!;
    const start = Math.max(VOL_N, ATR_N, candles.length - LOOKBACK_DAYS);
    for (let i = start; i < candles.length; i++) {
      const prev = candles[i - 1]!;
      const cur = candles[i]!;
      const date = etDate(cur.timestamp);
      const range = cur.high - cur.low;
      if (!(range > 0)) continue;

      const atrVal = atr(candles, i, ATR_N);
      const avgVol = smaVolume(candles, i - 1, VOL_N); // prior 20 days, no look-ahead
      if (atrVal == null || avgVol == null || avgVol <= 0 || cur.volume == null) continue;

      const gapPct = (cur.open - prev.close) / prev.close;
      const rangeAtr = range / atrVal;
      const rvol = cur.volume / avgVol;
      const closeLoc = (cur.close - cur.low) / range;
      const ret = (cur.close - prev.close) / prev.close;
      const spyRet = spyRetByDate.get(date);
      const universe = TAPE.has(symbol) ? "tape_index" : "single_name";
      const relative =
        symbol === "SPY" || spyRet == null ? "" : classifyRelative(ret, spyRet);

      rows.push({
        symbol,
        date,
        universe,
        dayTypeHint: classifyDayHint(closeLoc, rangeAtr),
        openType: "",
        gap: classifyGap(gapPct, cur.open, cur.high, cur.low, cur.close, prev.close),
        volatility: classifyVol(rangeAtr),
        participation: classifyRvol(rvol),
        catalyst: "",
        relative,
        gapPct: (gapPct * 100).toFixed(2),
        rangeAtr: rangeAtr.toFixed(2),
        rvol: rvol.toFixed(2),
        closeLoc: closeLoc.toFixed(2),
        retPct: (ret * 100).toFixed(2),
        spyRetPct: spyRet == null ? "" : (spyRet * 100).toFixed(2),
        status: "proposed",
        notes: "openType blank — confirm dayTypeHint on chart (daily + 5m open)",
      });
    }
  }

  rows.sort((a, b) => (a.date === b.date ? a.symbol.localeCompare(b.symbol) : b.date.localeCompare(a.date)));

  const outDir = path.join(process.cwd(), "data/day-profiles/proposed");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const outPath = path.join(outDir, `batch-${stamp}.csv`);

  const headers = [
    "symbol",
    "date",
    "universe",
    "dayTypeHint",
    "openType",
    "gap",
    "volatility",
    "participation",
    "catalyst",
    "relative",
    "gapPct",
    "rangeAtr",
    "rvol",
    "closeLoc",
    "retPct",
    "spyRetPct",
    "status",
    "notes",
  ] as const;

  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(String(r[h]))).join(",")),
  ];
  writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");

  const byDayType = new Map<string, number>();
  for (const r of rows) {
    byDayType.set(r.dayTypeHint, (byDayType.get(r.dayTypeHint) ?? 0) + 1);
  }

  console.log(
    JSON.stringify(
      {
        symbols: [...SYMBOLS],
        lookbackDays: LOOKBACK_DAYS,
        rows: rows.length,
        outPath: path.relative(process.cwd(), outPath),
        dayTypeHintCounts: Object.fromEntries(byDayType),
        review: {
          confirm: ["dayTypeHint → dayType", "openType on 5m", "relative / gap edge cases"],
          trust: ["gap", "volatility", "participation", "metrics columns"],
          how: "Open symbol on chart at date; accept or edit; set status=confirmed when done",
        },
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
