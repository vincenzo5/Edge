import "server-only";

import { getServerMarketDataService } from "@/lib/marketData/service/server";

import type { ResearchComputePort } from "./port";
import { ResearchComputeService } from "./service";

let singleton: ResearchComputeService | null = null;

export function getResearchComputeService(): ResearchComputePort {
  if (!singleton) {
    singleton = new ResearchComputeService(getServerMarketDataService());
  }
  return singleton;
}

export function resetResearchComputeServiceForTests(): void {
  singleton = null;
}
