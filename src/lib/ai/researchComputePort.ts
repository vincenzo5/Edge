import type { ResearchComputePort } from "@/lib/researchCompute/port";

export type { ResearchComputePort };

export function requireResearchCompute(context: {
  researchCompute: ResearchComputePort | null;
}): ResearchComputePort {
  if (!context.researchCompute) {
    throw new Error("Research compute unavailable");
  }
  return context.researchCompute;
}
