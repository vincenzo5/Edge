#!/usr/bin/env npx tsx
/**
 * Propose day-profile labels from daily OHLCV (measurable tags + coarse hints).
 * Usage: npx tsx scripts/day-profiles-propose.mts [--days=10] [--skip-open] [--dry-run]
 *
 * Human still confirms L1/L2. openType is prefilled as a mechanical hint from RTH 5m.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  atr,
  classifyDayHint,
  classifyGap,
  classifyOpenType,
  classifyRelative,
  classifyRvol,
  classifyVol,
  etDate,
  rthBars,
  smaVolume,
} from "../src/lib/dayProfiles";
import { getChartCandles, getChartCandlesInPeriod, type Candle } from "../src/lib/yahooFinance";

const SYMBOLS = ["SPY", "QQQ", "AAPL", "NVDA", "TSLA"] as const;
const TAPE = new Set(["SPY", "QQQ"]);
const ATR_N = 14;
const VOL_N = 20;
const OPEN_FETCH_DELAY_MS = 250;

const daysArg = process.argv.find((a) => a.startsWith("--days="));
const LOOKBACK_DAYS = daysArg ? Number.parseInt(daysArg.split("=")[1]!, 10) : 10;
const SKIP_OPEN = process.argv.includes("--skip-open");
const DRY_RUN = process.argv.includes("--dry-run");

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

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOpenBars(symbol: string, date: string): Promise<Candle[]> {
  const dayStart = new Date(`${date}T00:00:00-04:00`);
  const dayEnd = new Date(`${date}T23:59:59-04:00`);
  const period1 = new Date(dayStart.getTime() - 2 * 24 * 60 * 60 * 1000);
  const period2 = new Date(dayEnd.getTime() + 24 * 60 * 60 * 1000);
  const candles = await getChartCandlesInPeriod(symbol, period1, period2, "5m");
  return rthBars(candles, date).slice(0, 18);
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
      const avgVol = smaVolume(candles, i - 1, VOL_N);
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
        notes: SKIP_OPEN
          ? "openType skipped — confirm dayTypeHint + openType on chart"
          : "openType hint — confirm L1/L2 on chart (daily + 5m open)",
      });
    }
  }

  rows.sort((a, b) => (a.date === b.date ? a.symbol.localeCompare(b.symbol) : b.date.localeCompare(a.date)));

  const openCache = new Map<string, Candle[]>();
  let openFilled = 0;
  let openUnknown = 0;

  if (!SKIP_OPEN) {
    for (const row of rows) {
      const key = `${row.symbol}:${row.date}`;
      let bars = openCache.get(key);
      if (!bars) {
        try {
          bars = await fetchOpenBars(row.symbol, row.date);
          openCache.set(key, bars);
          await sleep(OPEN_FETCH_DELAY_MS);
        } catch (e) {
          bars = [];
          console.error(`warn ${key}: ${e instanceof Error ? e.message : e}`);
        }
      }
      row.openType = bars.length >= 6 ? classifyOpenType(bars) : "open_unknown";
      if (row.openType === "open_unknown") openUnknown += 1;
      else openFilled += 1;
    }
  }

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

  if (!DRY_RUN) {
    writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
  }

  const byDayType = new Map<string, number>();
  const byOpenType = new Map<string, number>();
  for (const r of rows) {
    byDayType.set(r.dayTypeHint, (byDayType.get(r.dayTypeHint) ?? 0) + 1);
    if (r.openType) byOpenType.set(r.openType, (byOpenType.get(r.openType) ?? 0) + 1);
  }

  console.log(
    JSON.stringify(
      {
        symbols: [...SYMBOLS],
        lookbackDays: LOOKBACK_DAYS,
        skipOpen: SKIP_OPEN,
        dryRun: DRY_RUN,
        rows: rows.length,
        outPath: DRY_RUN ? null : path.relative(process.cwd(), outPath),
        dayTypeHintCounts: Object.fromEntries(byDayType),
        openTypeCounts: Object.fromEntries(byOpenType),
        openFilled,
        openUnknown,
        review: {
          confirm: ["dayTypeHint → dayType", "openType hint on 5m", "relative / gap edge cases"],
          trust: ["gap", "volatility", "participation", "metrics columns"],
          how: "Open symbol on chart at date; accept or edit; set status=confirmed when done",
        },
        sample: rows.slice(0, 3),
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
