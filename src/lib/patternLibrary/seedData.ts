import type { OhlcvBar, PatternRecord, SetupDecision } from "./types";
import { DEFAULT_SETUP_FAMILIES } from "./taxonomy";
import { FROZEN_CHART_STYLE } from "./renderChart";

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SYMBOLS = [
  "AAPL", "MSFT", "NVDA", "TSLA", "META", "AMZN", "GOOGL", "AMD", "NFLX", "CRM",
  "SPY", "QQQ", "IWM", "COIN", "PLTR", "SOFI", "UBER", "SHOP", "SQ", "ROKU",
];

function generateBars(
  rng: () => number,
  count: number,
  startPrice: number,
  startTs: number,
  barMs: number,
  bias: "up" | "down" | "flat" | "spring" | "breakout",
): OhlcvBar[] {
  const bars: OhlcvBar[] = [];
  let price = startPrice;
  for (let i = 0; i < count; i++) {
    const drift =
      bias === "up"
        ? 0.003
        : bias === "down"
          ? -0.003
          : bias === "breakout"
            ? i > count * 0.7
              ? 0.008
              : 0.001
            : 0;
    const noise = (rng() - 0.5) * 0.012;
    const open = price;
    let close = price * (1 + drift + noise);
    if (bias === "spring" && i === count - 2) {
      close = price * 0.985;
    }
    if (bias === "spring" && i === count - 1) {
      close = price * 1.008;
    }
    const high = Math.max(open, close) * (1 + rng() * 0.004);
    const low = Math.min(open, close) * (1 - rng() * 0.004);
    const volume = Math.floor(500_000 + rng() * 2_000_000);
    bars.push({
      timestamp: startTs + i * barMs,
      open,
      high,
      low,
      close,
      volume,
    });
    price = close;
  }
  return bars;
}

const BIAS_BY_FAMILY: Record<string, "up" | "down" | "flat" | "spring" | "breakout"> = {
  pullback_in_trend: "up",
  breakout_retest: "breakout",
  range_fade: "flat",
  failed_breakdown: "spring",
  momentum_continuation: "up",
  reversal_climax: "up",
};

export function generateSeedRecords(count = 100, seed = 42): PatternRecord[] {
  const rng = mulberry32(seed);
  const families = DEFAULT_SETUP_FAMILIES;
  const barMs = 60 * 60 * 1000;
  const baseTs = Date.parse("2025-01-02T14:30:00.000Z");
  const records: PatternRecord[] = [];

  for (let i = 0; i < count; i++) {
    const family = families[i % families.length]!;
    const symbol = SYMBOLS[i % SYMBOLS.length]!;
    const asOf = new Date(baseTs + i * 24 * 60 * 60 * 1000).toISOString();
    const asOfMs = new Date(asOf).getTime();
    const barWindow = 48;
    const startTs = asOfMs - barWindow * barMs;
    const startPrice = 50 + rng() * 150;
    const bias = BIAS_BY_FAMILY[family.id] ?? "flat";
    const ohlcv = generateBars(rng, barWindow, startPrice, startTs, barMs, bias);
    const last = ohlcv[ohlcv.length - 1]!;
    const decision: SetupDecision = rng() > 0.45 ? "take" : "pass";
    const quality = (Math.floor(rng() * 5) + 1) as 1 | 2 | 3 | 4 | 5;
    const direction =
      family.id === "range_fade" || family.id === "reversal_climax"
        ? rng() > 0.5
          ? "short"
          : "long"
        : "long";
    const atr = last.close * 0.02;
    const entry = last.close;
    const stop =
      direction === "long" ? last.low - atr * 0.5 : last.high + atr * 0.5;
    const target =
      direction === "long" ? entry + atr * 2 : entry - atr * 2;
    const win = rng() > 0.42;

    records.push({
      id: `seed-${String(i + 1).padStart(3, "0")}`,
      asOf,
      symbol,
      timeframe: i % 3 === 0 ? "15m" : i % 3 === 1 ? "1h" : "4h",
      barWindow,
      setupFamilyId: family.id,
      quality,
      decision,
      regime:
        bias === "up"
          ? "uptrend"
          : bias === "down"
            ? "downtrend"
            : bias === "flat"
              ? "range"
              : "volatile",
      plan: {
        direction,
        entry,
        stop,
        targets: [target],
        thesis: `${family.name} on ${symbol} — quality ${quality}`,
      },
      outcome: {
        resolved: decision === "take",
        win: decision === "take" ? win : null,
        rMultiple: decision === "take" ? (win ? rng() * 3 + 0.5 : -(rng() * 1.5 + 0.3)) : null,
        mfe: decision === "take" ? atr * (win ? 2 : 0.8) : null,
        mae: decision === "take" ? atr * (win ? 0.5 : 1.2) : null,
        holdBars: decision === "take" ? Math.floor(rng() * 20) + 3 : null,
      },
      ohlcv,
      chartStyleId: FROZEN_CHART_STYLE.id,
      notes: decision === "pass" ? "Near-miss — structure incomplete" : undefined,
    });
  }

  return records;
}
