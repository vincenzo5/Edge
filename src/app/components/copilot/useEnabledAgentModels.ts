"use client";

import { useSyncExternalStore } from "react";

import {
  getEnabledAgentModelsSnapshot,
  getEnabledModelIdsSnapshot,
  subscribeEnabledModels,
} from "@/lib/ai/model/enabledModelsStore";
import type { ModelRef } from "@/lib/ai/model/types";

export function useEnabledAgentModels(): ModelRef[] {
  return useSyncExternalStore(
    subscribeEnabledModels,
    getEnabledAgentModelsSnapshot,
    getEnabledAgentModelsSnapshot,
  );
}

export function useEnabledModelIds(): string[] {
  return useSyncExternalStore(
    subscribeEnabledModels,
    getEnabledModelIdsSnapshot,
    getEnabledModelIdsSnapshot,
  );
}
