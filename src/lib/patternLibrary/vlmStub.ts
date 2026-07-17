import type { PatternRecord } from "./types";
import { predictFromRules } from "./rules";
import { predictFromRetrieval } from "./retrieval";

/**
 * Deterministic few-shot VLM stub for bake-off Arm A.
 * Uses feature heuristics + nearest-neighbor family hint — not a live API call.
 * Replace with a real multimodal adapter when API keys are configured.
 */
export function predictFewShotVlmStub(
  query: PatternRecord,
  exemplars: PatternRecord[],
  topK = 3,
): {
  predictedFamilyId: string | null;
  predictedDirection: "long" | "short" | "neutral";
  predictedStop: number | null;
  confidence: number;
  rationale: string;
} {
  const retrieval = predictFromRetrieval(query, exemplars, topK);
  const rules = predictFromRules(query);

  let family = retrieval.predictedFamilyId ?? rules.predictedFamilyId;
  let direction = retrieval.predictedDirection;
  let confidence = retrieval.confidence * 0.6 + rules.confidence * 0.4;

  if (rules.confidence > retrieval.confidence) {
    direction = rules.predictedDirection;
    family = rules.predictedFamilyId ?? family;
  }

  const stop = retrieval.predictedStop ?? rules.predictedStop;

  if (confidence < 0.35) {
    return {
      predictedFamilyId: family,
      predictedDirection: "neutral",
      predictedStop: stop,
      confidence,
      rationale: "Stub VLM abstains — low confidence on pattern geometry",
    };
  }

  return {
    predictedFamilyId: family,
    predictedDirection: direction,
    predictedStop: stop,
    confidence: Math.min(0.95, confidence + 0.05),
    rationale: `Stub VLM fused retrieval (${retrieval.neighbors.length} shots) with rule hints`,
  };
}

export type VlmAdapter = (
  query: PatternRecord,
  exemplars: PatternRecord[],
) => Promise<{
  predictedFamilyId: string | null;
  predictedDirection: "long" | "short" | "neutral";
  predictedStop: number | null;
  confidence: number;
  rationale?: string;
}>;

export const defaultVlmAdapter: VlmAdapter = async (query, exemplars) =>
  predictFewShotVlmStub(query, exemplars);
