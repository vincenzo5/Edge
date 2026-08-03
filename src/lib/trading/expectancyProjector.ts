/**
 * Compound expectancy projector — deterministic and Monte Carlo equity paths.
 * Pure functions; no React or persistence imports.
 */

export type ExpectancyPresetId = "retail_1pct" | "aggressive_10pct" | "rousseau_ish" | "custom";

export type ExpectancyParams = {
  startingEquity: number;
  years: number;
  winRate: number;
  avgWinR: number;
  avgLossR: number;
  riskFraction: number;
  tradesPerWeek: number;
};

export type ExpectancyPreset = ExpectancyParams & {
  id: ExpectancyPresetId;
  label: string;
  description: string;
};

export const TRADING_WEEKS_PER_YEAR = 52;
export const DEFAULT_MONTE_CARLO_RUNS = 1000;
export const MAX_MONTE_CARLO_RUNS = 5000;
export const RUIN_THRESHOLD_FRACTION = 0.2;

export const EXPECTANCY_PRESETS: ExpectancyPreset[] = [
  {
    id: "retail_1pct",
    label: "Retail 1%",
    description: "Conservative textbook sizing",
    startingEquity: 40_000,
    years: 9,
    winRate: 0.4,
    avgWinR: 2,
    avgLossR: 1,
    riskFraction: 0.01,
    tradesPerWeek: 2,
  },
  {
    id: "aggressive_10pct",
    label: "Aggressive 10%",
    description: "High risk, asymmetric payoff",
    startingEquity: 40_000,
    years: 9,
    winRate: 0.4,
    avgWinR: 3,
    avgLossR: 1,
    riskFraction: 0.1,
    tradesPerWeek: 1,
  },
  {
    id: "rousseau_ish",
    label: "Rousseau-ish",
    description: "Illustrative — not verified",
    startingEquity: 40_000,
    years: 9,
    winRate: 0.4,
    avgWinR: 3,
    avgLossR: 1,
    riskFraction: 0.1,
    tradesPerWeek: 0.75,
  },
];

export const DEFAULT_EXPECTANCY_PARAMS: ExpectancyParams = {
  ...EXPECTANCY_PRESETS[1]!,
};

export type ExpectancyValidationError = {
  ok: false;
  error: string;
};

export type ExpectancyValidationOk = {
  ok: true;
  params: ExpectancyParams;
};

export function validateExpectancyParams(
  raw: Partial<ExpectancyParams>,
): ExpectancyValidationOk | ExpectancyValidationError {
  const params: ExpectancyParams = {
    startingEquity: raw.startingEquity ?? DEFAULT_EXPECTANCY_PARAMS.startingEquity,
    years: raw.years ?? DEFAULT_EXPECTANCY_PARAMS.years,
    winRate: raw.winRate ?? DEFAULT_EXPECTANCY_PARAMS.winRate,
    avgWinR: raw.avgWinR ?? DEFAULT_EXPECTANCY_PARAMS.avgWinR,
    avgLossR: raw.avgLossR ?? DEFAULT_EXPECTANCY_PARAMS.avgLossR,
    riskFraction: raw.riskFraction ?? DEFAULT_EXPECTANCY_PARAMS.riskFraction,
    tradesPerWeek: raw.tradesPerWeek ?? DEFAULT_EXPECTANCY_PARAMS.tradesPerWeek,
  };

  if (!Number.isFinite(params.startingEquity) || params.startingEquity <= 0) {
    return { ok: false, error: "Starting equity must be greater than zero." };
  }
  if (!Number.isFinite(params.years) || params.years <= 0) {
    return { ok: false, error: "Horizon must be greater than zero years." };
  }
  if (!Number.isFinite(params.winRate) || params.winRate < 0 || params.winRate > 1) {
    return { ok: false, error: "Win rate must be between 0% and 100%." };
  }
  if (!Number.isFinite(params.avgWinR) || params.avgWinR <= 0) {
    return { ok: false, error: "Average win must be greater than zero R." };
  }
  if (!Number.isFinite(params.avgLossR) || params.avgLossR <= 0) {
    return { ok: false, error: "Average loss must be greater than zero R." };
  }
  if (!Number.isFinite(params.riskFraction) || params.riskFraction <= 0 || params.riskFraction > 1) {
    return { ok: false, error: "Risk per trade must be between 0% and 100%." };
  }
  if (!Number.isFinite(params.tradesPerWeek) || params.tradesPerWeek <= 0) {
    return { ok: false, error: "Trades per week must be greater than zero." };
  }

  return { ok: true, params };
}

export function computeEvR(params: Pick<ExpectancyParams, "winRate" | "avgWinR" | "avgLossR">): number {
  return params.winRate * params.avgWinR - (1 - params.winRate) * params.avgLossR;
}

export function computeTradeCount(params: Pick<ExpectancyParams, "years" | "tradesPerWeek">): number {
  return Math.max(1, Math.round(params.years * TRADING_WEEKS_PER_YEAR * params.tradesPerWeek));
}

export function streakDrawdown(riskFraction: number, consecutiveLosses: number): number {
  if (consecutiveLosses <= 0) return 0;
  const remaining = (1 - riskFraction) ** consecutiveLosses;
  return 1 - remaining;
}

export type EquityCurvePoint = {
  label: string;
  equity: number;
  tradeIndex: number;
};

export type DeterministicProjection = {
  evR: number;
  tradeCount: number;
  growthPerTrade: number;
  endingEquity: number;
  multiple: number;
  cagr: number;
  monthlyReturn: number;
  weeklyReturn: number;
  drawdownStreak5: number;
  drawdownStreak8: number;
  curvePoints: EquityCurvePoint[];
};

export function projectDeterministic(params: ExpectancyParams): DeterministicProjection | ExpectancyValidationError {
  const validated = validateExpectancyParams(params);
  if (!validated.ok) return validated;

  const p = validated.params;
  const evR = computeEvR(p);
  const tradeCount = computeTradeCount(p);
  const growthPerTrade = 1 + p.riskFraction * evR;

  if (growthPerTrade <= 0) {
    return { ok: false, error: "Growth per trade is non-positive — edge or sizing destroys equity." };
  }

  const endingEquity = p.startingEquity * growthPerTrade ** tradeCount;
  const multiple = endingEquity / p.startingEquity;
  const cagr = multiple ** (1 / p.years) - 1;
  const monthlyReturn = (1 + cagr) ** (1 / 12) - 1;
  const weeklyReturn = (1 + cagr) ** (1 / TRADING_WEEKS_PER_YEAR) - 1;

  const curvePoints: EquityCurvePoint[] = [{ label: "Start", equity: p.startingEquity, tradeIndex: 0 }];
  const yearsWhole = Math.max(1, Math.ceil(p.years));
  for (let year = 1; year <= yearsWhole; year += 1) {
    const tradesThroughYear = Math.min(tradeCount, Math.round(year * TRADING_WEEKS_PER_YEAR * p.tradesPerWeek));
    const equity = p.startingEquity * growthPerTrade ** tradesThroughYear;
    curvePoints.push({
      label: year === yearsWhole ? `${p.years}y` : `Y${year}`,
      equity,
      tradeIndex: tradesThroughYear,
    });
  }

  return {
    evR,
    tradeCount,
    growthPerTrade,
    endingEquity,
    multiple,
    cagr,
    monthlyReturn,
    weeklyReturn,
    drawdownStreak5: streakDrawdown(p.riskFraction, 5),
    drawdownStreak8: streakDrawdown(p.riskFraction, 8),
    curvePoints,
  };
}

export type MonteCarloBandPoint = {
  tradeIndex: number;
  median: number;
  p10: number;
  p90: number;
};

export type MonteCarloProjection = {
  runs: number;
  seed: number;
  tradeCount: number;
  evR: number;
  medianEnding: number;
  p10Ending: number;
  p90Ending: number;
  ruinRate: number;
  medianMaxDrawdown: number;
  p90MaxDrawdown: number;
  bandCurve: MonteCarloBandPoint[];
};

/** Seeded PRNG — deterministic across runs for tests. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower]!;
  const weight = index - lower;
  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
}

export function projectMonteCarlo(
  params: ExpectancyParams,
  options?: { runs?: number; seed?: number },
): MonteCarloProjection | ExpectancyValidationError {
  const validated = validateExpectancyParams(params);
  if (!validated.ok) return validated;

  const p = validated.params;
  const evR = computeEvR(p);
  const tradeCount = computeTradeCount(p);
  const runs = Math.min(
    MAX_MONTE_CARLO_RUNS,
    Math.max(100, Math.round(options?.runs ?? DEFAULT_MONTE_CARLO_RUNS)),
  );
  const seed = options?.seed ?? 42;

  if (evR <= 0 && p.riskFraction > 0) {
    return { ok: false, error: "Negative expectancy with positive risk — Monte Carlo would decay." };
  }

  const endingEquities: number[] = [];
  const maxDrawdowns: number[] = [];
  const bandSamples: number[][] = Array.from({ length: tradeCount + 1 }, () => []);

  for (let run = 0; run < runs; run += 1) {
    const random = createSeededRandom(seed + run * 9973);
    let equity = p.startingEquity;
    let peak = equity;
    let maxDrawdown = 0;

    bandSamples[0]!.push(equity);

    for (let trade = 1; trade <= tradeCount; trade += 1) {
      const won = random() < p.winRate;
      const deltaR = won ? p.avgWinR : -p.avgLossR;
      equity *= 1 + p.riskFraction * deltaR;
      if (equity <= 0) equity = 0;
      peak = Math.max(peak, equity);
      if (peak > 0) {
        maxDrawdown = Math.max(maxDrawdown, (peak - equity) / peak);
      }
      bandSamples[trade]!.push(equity);
    }

    endingEquities.push(equity);
    maxDrawdowns.push(maxDrawdown);
  }

  endingEquities.sort((a, b) => a - b);
  maxDrawdowns.sort((a, b) => a - b);

  const ruinThreshold = p.startingEquity * RUIN_THRESHOLD_FRACTION;
  const ruinRate = endingEquities.filter((value) => value < ruinThreshold).length / runs;

  const sampleStride = Math.max(1, Math.floor(tradeCount / 20));
  const bandCurve: MonteCarloBandPoint[] = [];
  for (let tradeIndex = 0; tradeIndex <= tradeCount; tradeIndex += sampleStride) {
    const sample = [...bandSamples[tradeIndex]!].sort((a, b) => a - b);
    bandCurve.push({
      tradeIndex,
      median: percentile(sample, 0.5),
      p10: percentile(sample, 0.1),
      p90: percentile(sample, 0.9),
    });
  }
  if (bandCurve[bandCurve.length - 1]?.tradeIndex !== tradeCount) {
    const sample = [...bandSamples[tradeCount]!].sort((a, b) => a - b);
    bandCurve.push({
      tradeIndex: tradeCount,
      median: percentile(sample, 0.5),
      p10: percentile(sample, 0.1),
      p90: percentile(sample, 0.9),
    });
  }

  return {
    runs,
    seed,
    tradeCount,
    evR,
    medianEnding: percentile(endingEquities, 0.5),
    p10Ending: percentile(endingEquities, 0.1),
    p90Ending: percentile(endingEquities, 0.9),
    ruinRate,
    medianMaxDrawdown: percentile(maxDrawdowns, 0.5),
    p90MaxDrawdown: percentile(maxDrawdowns, 0.9),
    bandCurve,
  };
}

export function formatExpectancyMoney(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatExpectancyPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatExpectancyMultiple(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k×`;
  if (value >= 10) return `${value.toFixed(0)}×`;
  return `${value.toFixed(2)}×`;
}
