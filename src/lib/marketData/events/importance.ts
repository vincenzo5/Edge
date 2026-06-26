import type { EventImportance } from "../contracts/events";
import type { CanonicalEventId } from "./registry";
import { getDefinitionForCanonicalId } from "./providerMappings";

export function defaultImportanceForCanonicalId(
  canonicalId: string,
): EventImportance {
  const def = getDefinitionForCanonicalId(canonicalId as CanonicalEventId);
  return def?.importance ?? "low";
}

export function importanceRank(importance: EventImportance): number {
  switch (importance) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}
