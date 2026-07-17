import type { PatternRecord } from "./types";
import { cosineSimilarity, extractOhlcvFeatures, featuresToVector, recordFeatureVector } from "./features";

export type SimilarSetup = {
  record: PatternRecord;
  score: number;
  rank: number;
};

export function rankSimilarSetups(
  query: PatternRecord,
  library: PatternRecord[],
  topK = 5,
  excludeIds: string[] = [],
): SimilarSetup[] {
  const exclude = new Set([query.id, ...excludeIds]);
  const queryVec = recordFeatureVector(query);

  const scored = library
    .filter((r) => !exclude.has(r.id))
    .map((record) => ({
      record,
      score: cosineSimilarity(queryVec, recordFeatureVector(record)),
      rank: 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map((item, i) => ({ ...item, rank: i + 1 }));
}

export type RetrievalPrediction = {
  predictedFamilyId: string | null;
  predictedDirection: "long" | "short" | "neutral";
  predictedStop: number | null;
  confidence: number;
  neighbors: SimilarSetup[];
};

export function predictFromRetrieval(
  query: PatternRecord,
  library: PatternRecord[],
  topK = 5,
): RetrievalPrediction {
  const neighbors = rankSimilarSetups(query, library, topK);
  if (neighbors.length === 0) {
    return {
      predictedFamilyId: null,
      predictedDirection: "neutral",
      predictedStop: null,
      confidence: 0,
      neighbors,
    };
  }

  const familyVotes = new Map<string, number>();
  const dirVotes = { long: 0, short: 0, neutral: 0 };
  let stopSum = 0;
  let stopCount = 0;
  let weightSum = 0;

  for (const n of neighbors) {
    const w = Math.max(0.001, n.score);
    weightSum += w;
    familyVotes.set(
      n.record.setupFamilyId,
      (familyVotes.get(n.record.setupFamilyId) ?? 0) + w,
    );
    dirVotes[n.record.plan.direction] += w;
    if (n.record.plan.stop != null) {
      stopSum += n.record.plan.stop * w;
      stopCount += w;
    }
  }

  let bestFamily: string | null = null;
  let bestFamilyWeight = 0;
  for (const [family, w] of familyVotes) {
    if (w > bestFamilyWeight) {
      bestFamily = family;
      bestFamilyWeight = w;
    }
  }

  let predictedDirection: "long" | "short" | "neutral" = "neutral";
  let bestDirWeight = 0;
  for (const dir of ["long", "short", "neutral"] as const) {
    if (dirVotes[dir] > bestDirWeight) {
      predictedDirection = dir;
      bestDirWeight = dirVotes[dir];
    }
  }

  const topScore = neighbors[0]?.score ?? 0;
  const confidence = weightSum > 0 ? Math.min(1, topScore * (bestFamilyWeight / weightSum)) : 0;

  return {
    predictedFamilyId: bestFamily,
    predictedDirection,
    predictedStop: stopCount > 0 ? stopSum / stopCount : null,
    confidence,
    neighbors,
  };
}

export function relativeComparisonScore(
  query: PatternRecord,
  candidate: PatternRecord,
  reference: PatternRecord,
): { prefersCandidate: boolean; queryToCandidate: number; queryToReference: number } {
  const q = featuresToVector(extractOhlcvFeatures(query.ohlcv));
  const c = featuresToVector(extractOhlcvFeatures(candidate.ohlcv));
  const r = featuresToVector(extractOhlcvFeatures(reference.ohlcv));
  const queryToCandidate = cosineSimilarity(q, c);
  const queryToReference = cosineSimilarity(q, r);
  return {
    prefersCandidate: queryToCandidate > queryToReference,
    queryToCandidate,
    queryToReference,
  };
}
