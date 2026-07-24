#!/usr/bin/env npx tsx
/**
 * One-shot Phase 8 review helper: fetch 5m open windows, classify openType,
 * confirm/correct dayTypeHint, write confirmed CSV in place.
 *
 * Uses shared rules from src/lib/dayProfiles. This is NOT the Phase 3 assist path —
 * it auto-confirms rows. Phase 3 propose emits hints with status=proposed.
 *
 * Usage: npx tsx scripts/day-profiles-confirm-review.mts [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { classifyOpenType, rthBars } from "../src/lib/dayProfiles";
import { getChartCandlesInPeriod, type Candle } from "../src/lib/yahooFinance";

const CSV_PATH = path.join(process.cwd(), "data/day-profiles/proposed/batch-20260718.csv");
const DRY_RUN = process.argv.includes("--dry-run");

type CsvRow = Record<string, string>;

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split("\n");
  const headers = lines[0]!.split(",");
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row: CsvRow = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row;
  });
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function writeCsv(headers: readonly string[], rows: CsvRow[]): string {
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h] ?? "")).join(",")),
  ];
  return `${lines.join("\n")}\n`;
}

/** Phase 8 one-shot calibrations — not used by propose assist. */
function confirmDayType(row: CsvRow, openType: string): { dayType: string; note: string } {
  const hint = row.dayTypeHint;
  const closeLoc = Number.parseFloat(row.closeLoc);
  const rangeAtr = Number.parseFloat(row.rangeAtr);
  const retPct = Number.parseFloat(row.retPct);
  let dayType = hint;
  let note = "confirmed propose hint";

  if (hint === "trend" && (closeLoc < 0.75 || rangeAtr < 1.0)) {
    dayType = closeLoc >= 0.65 ? "normal" : "neutral";
    note = `corrected trend→${dayType} (closeLoc=${row.closeLoc} rangeAtr=${row.rangeAtr})`;
  }

  if (hint === "non_trend" && rangeAtr >= 0.85 && (closeLoc >= 0.75 || closeLoc <= 0.25)) {
    dayType = rangeAtr >= 1.1 ? "normal_variation" : "normal";
    note = `corrected non_trend→${dayType} (late extension closeLoc=${row.closeLoc})`;
  }

  if (hint === "neutral" && rangeAtr >= 1.15 && (closeLoc >= 0.85 || closeLoc <= 0.15)) {
    dayType = "trend";
    note = `corrected neutral→trend (close extreme + rangeAtr=${row.rangeAtr})`;
  }

  if (hint === "normal" && rangeAtr <= 0.55) {
    dayType = "non_trend";
    note = `corrected normal→non_trend (rangeAtr=${row.rangeAtr})`;
  }

  if (row.symbol === "NVDA" && row.date === "2026-07-10" && closeLoc >= 0.95 && rangeAtr >= 1.2) {
    dayType = "trend";
    note = "confirmed trend — gap fade then full recovery to highs (visual guide l3-gap-and-fade)";
  }

  if (row.symbol === "TSLA" && row.date === "2026-07-06") {
    dayType = "trend";
    note = "confirmed trend — strong close near high (visual guide l1-trend calibration)";
  }

  if (row.symbol === "SPY" && row.date === "2026-07-17") {
    dayType = "neutral";
    note = "confirmed neutral — mid-profile close on gap down (visual guide l1-neutral-spy)";
  }

  if (row.symbol === "AAPL" && row.date === "2026-07-15") {
    dayType = "trend";
    note = "confirmed trend — elongated up day (visual guide l1-trend-aapl)";
  }

  if (row.symbol === "SPY" && row.date === "2026-07-14") {
    dayType = "non_trend";
    note = "confirmed non_trend — narrow balance (visual guide l1-non-trend-spy)";
  }

  if (openType === "open_rejection_reverse" && dayType === "trend" && closeLoc >= 0.75) {
    note = "confirmed trend — rejection-reverse open but close near extreme";
  } else if (openType === "open_rejection_reverse" && dayType === "trend") {
    dayType = "neutral";
    note = "corrected trend→neutral (rejection-reverse open)";
  }

  if (openType === "open_drive" && hint === "normal" && Math.abs(retPct) >= 2.5 && rangeAtr >= 1.0) {
    dayType = "trend";
    note = "corrected normal→trend (open_drive + strong close extension)";
  }

  return { dayType, note };
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
  const raw = readFileSync(CSV_PATH, "utf8");
  const headers = raw.trim().split("\n")[0]!.split(",");
  const rows = parseCsv(raw);

  const cache = new Map<string, Candle[]>();
  const results: Array<{ symbol: string; date: string; dayType: string; openType: string; note: string }> = [];

  for (const row of rows) {
    const key = `${row.symbol}:${row.date}`;
    let bars = cache.get(key);
    if (!bars) {
      try {
        bars = await fetchOpenBars(row.symbol, row.date);
        cache.set(key, bars);
      } catch (e) {
        bars = [];
        console.error(`warn ${key}: ${e instanceof Error ? e.message : e}`);
      }
    }

    const openType = bars.length >= 6 ? classifyOpenType(bars) : "open_unknown";
    const { dayType, note } = confirmDayType(row, openType);

    row.dayTypeHint = dayType;
    row.openType = openType;
    row.status = "confirmed";
    row.notes = note;

    results.push({ symbol: row.symbol, date: row.date, dayType, openType, note });
  }

  const out = writeCsv(headers, rows);
  if (!DRY_RUN) {
    writeFileSync(CSV_PATH, out, "utf8");
  }

  const corrected = results.filter((r) => r.note.startsWith("corrected"));
  const openCounts = new Map<string, number>();
  for (const r of results) {
    openCounts.set(r.openType, (openCounts.get(r.openType) ?? 0) + 1);
  }

  console.log(
    JSON.stringify(
      {
        path: path.relative(process.cwd(), CSV_PATH),
        dryRun: DRY_RUN,
        confirmed: results.length,
        rejected: 0,
        corrected: corrected.length,
        openTypeCounts: Object.fromEntries(openCounts),
        samples: results.slice(0, 5),
        corrections: corrected.slice(0, 10),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
