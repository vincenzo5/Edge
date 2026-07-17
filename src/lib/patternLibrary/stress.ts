import type { PatternRecord } from "./types";
import { assertNoLookAhead } from "./holdout";
import { rankSimilarSetups, relativeComparisonScore } from "./retrieval";
import { recordFeatureVector } from "./features";
import { renderStyleVariant } from "./renderChart";
import { cosineSimilarity } from "./features";

export type LookAheadAudit = {
  total: number;
  violations: string[];
  pass: boolean;
};

export function auditLookAhead(records: PatternRecord[]): LookAheadAudit {
  const violations: string[] = [];
  for (const r of records) {
    if (!assertNoLookAhead(r)) {
      violations.push(r.id);
    }
  }
  return {
    total: records.length,
    violations,
    pass: violations.length === 0,
  };
}

export type StyleAblationResult = {
  recordId: string;
  darkVsLightSimilarity: number;
  retrievalStable: boolean;
};

export function runStyleAblation(
  record: PatternRecord,
  library: PatternRecord[],
  similarityThreshold = 0.85,
): StyleAblationResult {
  const darkSvg = renderStyleVariant(record.ohlcv, "dark");
  const lightSvg = renderStyleVariant(record.ohlcv, "light");
  const darkLen = darkSvg.length;
  const lightLen = lightSvg.length;
  const darkVsLightSimilarity = 1 - Math.abs(darkLen - lightLen) / Math.max(darkLen, lightLen);

  const neighborsBefore = rankSimilarSetups(record, library, 3);
  const perturbed: PatternRecord = {
    ...record,
    ohlcv: record.ohlcv.map((b) => ({
      ...b,
      close: b.close * 1.0001,
    })),
  };
  const neighborsAfter = rankSimilarSetups(perturbed, library, 3);
  const topBefore = neighborsBefore[0]?.record.id;
  const topAfter = neighborsAfter[0]?.record.id;
  const vecBefore = recordFeatureVector(record);
  const vecAfter = recordFeatureVector(perturbed);
  const featureStable = cosineSimilarity(vecBefore, vecAfter) > similarityThreshold;

  return {
    recordId: record.id,
    darkVsLightSimilarity,
    retrievalStable: topBefore === topAfter && featureStable,
  };
}

export type BiasCheckResult = {
  longAccuracy: number | null;
  shortAccuracy: number | null;
  gapPp: number | null;
  pass: boolean;
  gateMaxPp: number;
};

export function checkDirectionBias(
  records: PatternRecord[],
  predictedDirections: Map<string, "long" | "short" | "neutral">,
  gateMaxPp = 10,
): BiasCheckResult {
  let longCorrect = 0;
  let longTotal = 0;
  let shortCorrect = 0;
  let shortTotal = 0;

  for (const r of records) {
    if (r.decision !== "take" || r.plan.direction === "neutral") continue;
    const pred = predictedDirections.get(r.id);
    if (!pred) continue;
    if (r.plan.direction === "long") {
      longTotal++;
      if (pred === "long") longCorrect++;
    } else {
      shortTotal++;
      if (pred === "short") shortCorrect++;
    }
  }

  const longAccuracy = longTotal > 0 ? longCorrect / longTotal : null;
  const shortAccuracy = shortTotal > 0 ? shortCorrect / shortTotal : null;
  const gapPp =
    longAccuracy != null && shortAccuracy != null
      ? Math.abs(longAccuracy - shortAccuracy) * 100
      : null;

  return {
    longAccuracy,
    shortAccuracy,
    gapPp,
    pass: gapPp == null ? true : gapPp <= gateMaxPp,
    gateMaxPp,
  };
}

export type RelativeComparisonResult = {
  total: number;
  correct: number;
  accuracy: number | null;
};

export function runRelativeComparisonTest(
  queries: PatternRecord[],
  library: PatternRecord[],
): RelativeComparisonResult {
  let correct = 0;
  let total = 0;

  for (const query of queries) {
    const sameFamily = library.filter(
      (r) => r.setupFamilyId === query.setupFamilyId && r.id !== query.id,
    );
    const diffFamily = library.filter(
      (r) => r.setupFamilyId !== query.setupFamilyId && r.id !== query.id,
    );
    const candidate = sameFamily[0];
    const reference = diffFamily[0];
    if (!candidate || !reference) continue;

    total++;
    const result = relativeComparisonScore(query, candidate, reference);
    if (result.prefersCandidate) correct++;
  }

  return {
    total,
    correct,
    accuracy: total > 0 ? correct / total : null,
  };
}

export type StressTestReport = {
  lookAhead: LookAheadAudit;
  styleAblation: StyleAblationResult[];
  bias: BiasCheckResult;
  relativeComparison: RelativeComparisonResult;
  pass: boolean;
};

export function runStressTests(
  records: PatternRecord[],
  predictedDirections: Map<string, "long" | "short" | "neutral">,
): StressTestReport {
  const lookAhead = auditLookAhead(records);
  const sample = records.slice(0, Math.min(10, records.length));
  const library = records;
  const styleAblation = sample.map((r) => runStyleAblation(r, library));
  const bias = checkDirectionBias(records, predictedDirections);
  const holdoutSample = records.filter((r) => r.decision === "take").slice(-20);
  const relativeComparison = runRelativeComparisonTest(holdoutSample, library);

  const pass =
    lookAhead.pass &&
    bias.pass &&
    styleAblation.every((s) => s.retrievalStable) &&
    (relativeComparison.accuracy ?? 0) >= 0.5;

  return {
    lookAhead,
    styleAblation,
    bias,
    relativeComparison,
    pass,
  };
}
