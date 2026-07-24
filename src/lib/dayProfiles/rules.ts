import type {
  DayType,
  GapType,
  OpenType,
  ParticipationType,
  RelativeType,
  VolatilityType,
} from "./types";

/** Minimal OHLC bar for daily metric helpers (timestamp in unix seconds). */
export type OhlcBar = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export function trueRange(c: OhlcBar, prev: OhlcBar): number {
  return Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close));
}

export function atr(candles: OhlcBar[], i: number, n: number): number | null {
  if (i < n) return null;
  let sum = 0;
  for (let k = i - n + 1; k <= i; k++) {
    sum += trueRange(candles[k]!, candles[k - 1]!);
  }
  return sum / n;
}

export function smaVolume(candles: OhlcBar[], i: number, n: number): number | null {
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

export function classifyGap(
  gapPct: number,
  open: number,
  high: number,
  low: number,
  close: number,
  prevClose: number,
): GapType {
  if (Math.abs(gapPct) < 0.002) return "gap_none";
  if (gapPct >= 0.002) {
    if (low > prevClose) return "gap_and_go";
    if (close < prevClose) return close < open ? "gap_and_fade" : "gap_fill";
    if (low <= prevClose && high > prevClose) return "gap_partial";
    return "gap_fill";
  }
  if (high < prevClose) return "gap_and_go";
  if (close > prevClose) return close > open ? "gap_and_fade" : "gap_fill";
  if (high >= prevClose && low < prevClose) return "gap_partial";
  return "gap_fill";
}

export function classifyVol(rangeAtr: number): VolatilityType {
  if (rangeAtr >= 2) return "vol_climax";
  if (rangeAtr >= 1.3) return "vol_expand";
  if (rangeAtr <= 0.6) return "vol_contract";
  return "vol_normal";
}

export function classifyRvol(rvol: number): ParticipationType {
  if (rvol >= 1.8) return "rvol_high";
  if (rvol <= 0.7) return "rvol_low";
  return "rvol_normal";
}

/** Coarse L1 hint from daily close location and range vs ATR. */
export function classifyDayHint(closeLoc: number, rangeAtr: number): DayType {
  if (rangeAtr <= 0.7) return "non_trend";
  if (rangeAtr >= 1.2 && (closeLoc >= 0.8 || closeLoc <= 0.2)) return "trend";
  if (rangeAtr < 1.3 && closeLoc >= 0.35 && closeLoc <= 0.65) return "neutral";
  return "normal";
}

export function classifyRelative(ret: number, spyRet: number): RelativeType {
  const excess = ret - spyRet;
  if (Math.abs(excess) < 0.003) return "beta_proxy";
  if (excess >= 0.005) return "leader";
  if (excess <= -0.005) return "laggard";
  return "idiosyncratic";
}
