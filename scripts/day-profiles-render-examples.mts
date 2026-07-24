#!/usr/bin/env npx tsx
/**
 * Render real candlestick SVG examples for the day-classification visual guide.
 * Usage: npx tsx scripts/day-profiles-render-examples.mts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { getChartCandles, getChartCandlesInPeriod, type Candle } from "../src/lib/yahooFinance";
import { renderCandlestickSvg, type ChartRenderStyle } from "../src/lib/patternLibrary/renderChart";
import type { OhlcvBar } from "../src/lib/patternLibrary/types";

const OUT_DIR = path.join(process.cwd(), "docs/trading/assets/examples");

const STYLE: ChartRenderStyle = {
  id: "day-class-examples-v1",
  width: 1100,
  height: 520,
  upColor: "#22c55e",
  downColor: "#ef4444",
  background: "#0b0f14",
  gridColor: "#1f2937",
};

function etDate(tsSec: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(tsSec * 1000));
}

function toBars(candles: Candle[]): OhlcvBar[] {
  return candles.map((c) => ({
    timestamp: c.timestamp * 1000,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));
}

function withTitle(svg: string, title: string): string {
  const escaped = title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return svg.replace(
    /<rect width="100%" height="100%" fill="[^"]+"\/>/,
    (bg) =>
      `${bg}\n  <text x="24" y="22" fill="#e5e7eb" font-family="system-ui,sans-serif" font-size="16" font-weight="600">${escaped}</text>`,
  );
}

async function renderDailyExample(args: {
  file: string;
  symbol: string;
  date: string;
  label: string;
  contextBefore?: number;
  contextAfter?: number;
}) {
  const daily = await getChartCandles(args.symbol, "6mo", "1d");
  const idx = daily.findIndex((c) => etDate(c.timestamp) === args.date);
  if (idx < 0) throw new Error(`${args.symbol} ${args.date}: daily bar not found`);

  const before = args.contextBefore ?? 12;
  const after = args.contextAfter ?? 2;
  const from = Math.max(0, idx - before);
  const to = Math.min(daily.length - 1, idx + after);
  const slice = daily.slice(from, to + 1);
  const highlight = idx - from;

  const svg = withTitle(
    renderCandlestickSvg(toBars(slice), STYLE, {
      sections: [{ fromRenderIndex: highlight, toRenderIndex: highlight, label: args.label }],
    }),
    `${args.symbol} · ${args.date} · ${args.label} (1D)`,
  );
  await writeSvgAndPng(args.file, svg);
  console.error(`wrote ${args.file} (${slice.length} daily bars)`);
}

async function writeSvgAndPng(fileSvg: string, svg: string) {
  const svgPath = path.join(OUT_DIR, fileSvg);
  writeFileSync(svgPath, svg, "utf8");
  const pngPath = svgPath.replace(/\.svg$/, ".png");
  await sharp(Buffer.from(svg)).png().toFile(pngPath);
}

async function renderIntradayOpen(args: {
  file: string;
  symbol: string;
  date: string;
  label: string;
}) {
  // Fetch a 5-day window of 5m bars and keep RTH for the target date (+ a bit of prior close context).
  const dayStart = new Date(`${args.date}T00:00:00-04:00`);
  const dayEnd = new Date(`${args.date}T23:59:59-04:00`);
  const period1 = new Date(dayStart.getTime() - 2 * 24 * 60 * 60 * 1000);
  const period2 = new Date(dayEnd.getTime() + 24 * 60 * 60 * 1000);
  const candles = await getChartCandlesInPeriod(args.symbol, period1, period2, "5m");
  if (candles.length === 0) throw new Error(`${args.symbol} ${args.date}: no 5m bars`);

  const dayBars = candles.filter((c) => etDate(c.timestamp) === args.date);
  if (dayBars.length < 10) {
    throw new Error(`${args.symbol} ${args.date}: only ${dayBars.length} 5m bars`);
  }

  // First ~90 minutes of RTH ≈ 18 five-minute bars from 9:30.
  const openWindow = dayBars.slice(0, 24);
  const driveEnd = Math.min(11, openWindow.length - 1); // ~ first hour

  const svg = withTitle(
    renderCandlestickSvg(toBars(openWindow), STYLE, {
      sections: [
        { fromRenderIndex: 0, toRenderIndex: driveEnd, label: "open window" },
      ],
    }),
    `${args.symbol} · ${args.date} · ${args.label} (5m open)`,
  );
  await writeSvgAndPng(args.file, svg);
  console.error(`wrote ${args.file} (${openWindow.length} 5m bars)`);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // L1 day types — real daily candles with the subject day highlighted
  await renderDailyExample({
    file: "l1-trend-aapl-2026-07-15.svg",
    symbol: "AAPL",
    date: "2026-07-15",
    label: "trend?",
  });
  await renderDailyExample({
    file: "l1-non-trend-spy-2026-07-14.svg",
    symbol: "SPY",
    date: "2026-07-14",
    label: "non_trend?",
  });
  await renderDailyExample({
    file: "l1-neutral-spy-2026-07-17.svg",
    symbol: "SPY",
    date: "2026-07-17",
    label: "neutral?",
  });
  await renderDailyExample({
    file: "l1-normal-aapl-2026-07-16.svg",
    symbol: "AAPL",
    date: "2026-07-16",
    label: "normal?",
  });

  // Gap examples on daily
  await renderDailyExample({
    file: "l3-gap-and-go-nvda-2026-07-14.svg",
    symbol: "NVDA",
    date: "2026-07-14",
    label: "gap_and_go?",
    contextBefore: 8,
    contextAfter: 1,
  });
  await renderDailyExample({
    file: "l3-gap-and-fade-nvda-2026-07-10.svg",
    symbol: "NVDA",
    date: "2026-07-10",
    label: "gap_and_fade?",
    contextBefore: 8,
    contextAfter: 1,
  });

  // L2 open types — real 5m first ~2 hours
  await renderIntradayOpen({
    file: "l2-open-aapl-2026-07-15.svg",
    symbol: "AAPL",
    date: "2026-07-15",
    label: "classify open",
  });
  await renderIntradayOpen({
    file: "l2-open-nvda-2026-07-14.svg",
    symbol: "NVDA",
    date: "2026-07-14",
    label: "classify open",
  });
  await renderIntradayOpen({
    file: "l2-open-tsla-2026-07-06.svg",
    symbol: "TSLA",
    date: "2026-07-06",
    label: "classify open",
  });

  console.log(
    JSON.stringify(
      {
        outDir: path.relative(process.cwd(), OUT_DIR),
        files: [
          "l1-trend-aapl-2026-07-15.svg",
          "l1-non-trend-spy-2026-07-14.svg",
          "l1-neutral-spy-2026-07-17.svg",
          "l1-normal-aapl-2026-07-16.svg",
          "l3-gap-and-go-nvda-2026-07-14.svg",
          "l3-gap-and-fade-nvda-2026-07-10.svg",
          "l2-open-aapl-2026-07-15.svg",
          "l2-open-nvda-2026-07-14.svg",
          "l2-open-tsla-2026-07-06.svg",
        ],
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
