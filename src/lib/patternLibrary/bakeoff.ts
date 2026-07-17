import type {
  BakeoffArm,
  BakeoffMetrics,
  BakeoffPrediction,
  PatternRecord,
  SuccessMetrics,
} from "./types";
import { computeAtr } from "./features";
import { splitByTimeHoldout } from "./holdout";
import { predictFromRetrieval } from "./retrieval";
import { predictFromRules } from "./rules";
import { defaultVlmAdapter, type VlmAdapter } from "./vlmStub";

export function wilsonInterval(
  successes: number,
  n: number,
  z = 1.96,
): [number, number] | null {
  if (n === 0) return null;
  const p = successes / n;
  const denom = 1 + (z ** 2) / n;
  const center = (p + (z ** 2) / (2 * n)) / denom;
  const margin =
    (z * Math.sqrt((p * (1 - p)) / n + (z ** 2) / (4 * n ** 2))) / denom;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

export function signedPointBiserial(
  confidences: number[],
  correct: boolean[],
): number | null {
  if (confidences.length !== correct.length || confidences.length < 2) return null;
  const n = confidences.length;
  const meanAll = confidences.reduce((a, b) => a + b, 0) / n;
  let sumCorrect = 0;
  let sumWrong = 0;
  let nCorrect = 0;
  let nWrong = 0;
  for (let i = 0; i < n; i++) {
    if (correct[i]) {
      sumCorrect += confidences[i]!;
      nCorrect++;
    } else {
      sumWrong += confidences[i]!;
      nWrong++;
    }
  }
  if (nCorrect === 0 || nWrong === 0) return null;
  const meanCorrect = sumCorrect / nCorrect;
  const meanWrong = sumWrong / nWrong;
  let varSum = 0;
  for (const c of confidences) varSum += (c - meanAll) ** 2;
  const sd = Math.sqrt(varSum / n);
  if (sd === 0) return 0;
  return ((meanCorrect - meanWrong) / sd) * Math.sqrt((nCorrect * nWrong) / (n * n));
}

function stopWithinHalfAtr(
  predicted: number | null,
  actual: number | null,
  bars: PatternRecord["ohlcv"],
): boolean | null {
  if (predicted == null || actual == null) return null;
  const atr = computeAtr(bars, 14);
  if (atr <= 0) return null;
  return Math.abs(predicted - actual) <= atr * 0.5;
}

export function scorePredictions(
  arm: BakeoffArm,
  records: PatternRecord[],
  predictions: BakeoffPrediction[],
): BakeoffMetrics {
  const byId = new Map(predictions.map((p) => [p.recordId, p]));
  let familyHits = 0;
  let familyTotal = 0;
  let dirHits = 0;
  let dirTotal = 0;
  let stopHits = 0;
  let stopTotal = 0;
  let longCorrect = 0;
  let longTotal = 0;
  let shortCorrect = 0;
  let shortTotal = 0;
  const confidences: number[] = [];
  const correctFlags: boolean[] = [];

  for (const record of records) {
    const pred = byId.get(record.id);
    if (!pred) continue;

    if (record.decision === "take") {
      familyTotal++;
      if (pred.predictedFamilyId === record.setupFamilyId) familyHits++;

      if (record.plan.direction !== "neutral") {
        dirTotal++;
        const hit = pred.predictedDirection === record.plan.direction;
        if (hit) dirHits++;
        confidences.push(pred.confidence);
        correctFlags.push(hit);

        if (record.plan.direction === "long") {
          longTotal++;
          if (pred.predictedDirection === "long") longCorrect++;
        } else if (record.plan.direction === "short") {
          shortTotal++;
          if (pred.predictedDirection === "short") shortCorrect++;
        }
      }

      const stopOk = stopWithinHalfAtr(
        pred.predictedStop,
        record.plan.stop,
        record.ohlcv,
      );
      if (stopOk != null) {
        stopTotal++;
        if (stopOk) stopHits++;
      }
    }
  }

  const longAcc = longTotal > 0 ? longCorrect / longTotal : null;
  const shortAcc = shortTotal > 0 ? shortCorrect / shortTotal : null;
  const longShortGapPp =
    longAcc != null && shortAcc != null ? Math.abs(longAcc - shortAcc) * 100 : null;

  return {
    arm,
    n: dirTotal,
    familyAccuracy: familyTotal > 0 ? familyHits / familyTotal : null,
    directionAccuracy: dirTotal > 0 ? dirHits / dirTotal : null,
    directionWilson95: wilsonInterval(dirHits, dirTotal),
    stopWithinHalfAtrRate: stopTotal > 0 ? stopHits / stopTotal : null,
    longShortGapPp,
    confidenceSignedR: signedPointBiserial(confidences, correctFlags),
  };
}

export type BakeoffResult = {
  trainCount: number;
  holdoutCount: number;
  cutoffAsOf: string | null;
  metrics: BakeoffMetrics[];
  predictions: BakeoffPrediction[];
  recommendation: string;
};

export async function runBakeoff(
  records: PatternRecord[],
  options: {
    holdoutFraction?: number;
    vlmAdapter?: VlmAdapter;
    fewShotCount?: number;
  } = {},
): Promise<BakeoffResult> {
  const { train, holdout, cutoffAsOf } = splitByTimeHoldout(
    records,
    options.holdoutFraction ?? 0.2,
  );
  const vlm = options.vlmAdapter ?? defaultVlmAdapter;
  const fewShotCount = options.fewShotCount ?? 5;
  const predictions: BakeoffPrediction[] = [];

  for (const record of holdout) {
    const vlmResult = await vlm(record, train.slice(-fewShotCount));
    predictions.push({
      recordId: record.id,
      arm: "few_shot_vlm",
      predictedFamilyId: vlmResult.predictedFamilyId,
      predictedDirection: vlmResult.predictedDirection,
      predictedStop: vlmResult.predictedStop,
      confidence: vlmResult.confidence,
      rationale: vlmResult.rationale,
    });

    const retrieval = predictFromRetrieval(record, train, 5);
    predictions.push({
      recordId: record.id,
      arm: "retrieval",
      predictedFamilyId: retrieval.predictedFamilyId,
      predictedDirection: retrieval.predictedDirection,
      predictedStop: retrieval.predictedStop,
      confidence: retrieval.confidence,
      rationale: `Top neighbor: ${retrieval.neighbors[0]?.record.id ?? "none"}`,
    });

    const rules = predictFromRules(record);
    predictions.push({
      recordId: record.id,
      arm: "rules",
      predictedFamilyId: rules.predictedFamilyId,
      predictedDirection: rules.predictedDirection,
      predictedStop: rules.predictedStop,
      confidence: rules.confidence,
      rationale: rules.matches[0]?.reason,
    });
  }

  const metrics: BakeoffMetrics[] = (
    ["few_shot_vlm", "retrieval", "rules"] as BakeoffArm[]
  ).map((arm) =>
    scorePredictions(
      arm,
      holdout,
      predictions.filter((p) => p.arm === arm),
    ),
  );

  const recommendation = buildRecommendation(metrics);

  return {
    trainCount: train.length,
    holdoutCount: holdout.length,
    cutoffAsOf,
    metrics,
    predictions,
    recommendation,
  };
}

function buildRecommendation(metrics: BakeoffMetrics[]): string {
  const byArm = new Map(metrics.map((m) => [m.arm, m]));
  const retrieval = byArm.get("retrieval");
  const vlm = byArm.get("few_shot_vlm");
  const rules = byArm.get("rules");

  if (!retrieval || !vlm || !rules) return "Insufficient metrics.";

  const retrievalDir = retrieval.directionAccuracy ?? 0;
  const vlmDir = vlm.directionAccuracy ?? 0;
  const rulesDir = rules.directionAccuracy ?? 0;

  if (retrievalDir >= vlmDir && retrievalDir >= rulesDir) {
    return "Favor pattern library + retrieval; use VLM as explainer over neighbors.";
  }
  if (rulesDir >= retrievalDir && rulesDir >= vlmDir) {
    return "Favor OHLCV rules/tools; charts are audit trail.";
  }
  if (vlmDir > retrievalDir && vlm.familyAccuracy != null && vlm.familyAccuracy > 0.5) {
    return "VLM names patterns but verify stops via OHLCV tools.";
  }
  return "All arms near chance — refine taxonomy labels and add negatives before fine-tune.";
}

export function passesProductionGates(
  metrics: BakeoffMetrics,
  gates: SuccessMetrics,
): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  const wilson = metrics.directionWilson95;
  if (wilson && wilson[0] <= gates.directionWilsonLowerMin) {
    failures.push(`Wilson lower ${wilson[0].toFixed(3)} <= ${gates.directionWilsonLowerMin}`);
  }
  if (
    metrics.confidenceSignedR != null &&
    metrics.confidenceSignedR < gates.confidenceCorrelationMin
  ) {
    failures.push(
      `Confidence r ${metrics.confidenceSignedR.toFixed(3)} < ${gates.confidenceCorrelationMin}`,
    );
  }
  if (
    metrics.longShortGapPp != null &&
    metrics.longShortGapPp > gates.longShortGapMaxPp
  ) {
    failures.push(
      `Long/short gap ${metrics.longShortGapPp.toFixed(1)}pp > ${gates.longShortGapMaxPp}pp`,
    );
  }
  return { pass: failures.length === 0, failures };
}
