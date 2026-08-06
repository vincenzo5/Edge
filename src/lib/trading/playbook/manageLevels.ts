import type { PriceAxisAnnotation } from "@edge/chart-core/priceAxisTypes";

import { resolvePlaybookTemplateFromInstance } from "./resolveTemplate";
import { planPlaybookSteps } from "./planSteps";
import type { ManageStep, PlaybookInstance } from "./types";

export type ManageLevelMarker = {
  price: number;
  label: string;
};

const ACTIVE_MANAGE_STATUSES = new Set<PlaybookInstance["status"]>([
  "pending_fill",
  "armed",
  "paused",
]);

function stepMarkerLabel(step: ManageStep): string {
  if (step.then.kind === "modifyStop" && step.then.breakEven) return "BE";
  if (step.then.kind === "modifyStop" && step.then.stopRMultiple != null) {
    return step.then.stopRMultiple === 0 ? "BE" : `${step.then.stopRMultiple}R lock`;
  }
  if (step.then.kind === "reduceQty") {
    const fraction = step.then.fraction;
    if (fraction === 0.5) return "½";
    if (fraction === 1 / 3) return "⅓";
    if (fraction === 2 / 3) return "⅔";
    return "scale";
  }
  if (step.then.kind === "attachTrail") return "trail";
  if (step.when.kind === "multipleOfR") return `${step.when.multiple}R`;
  return step.label;
}

function pendingStepMarkers(instance: PlaybookInstance, steps: ManageStep[]): ManageLevelMarker[] {
  const markers: ManageLevelMarker[] = [];
  for (const step of steps) {
    const runtime = instance.ruleRuntimes.find((item) => item.ruleId === step.ruleId);
    if (runtime?.status !== "pending" && runtime?.status !== "armed") continue;
    if (step.triggerPrice != null) {
      markers.push({ price: step.triggerPrice, label: stepMarkerLabel(step) });
    }
    if (
      step.then.kind === "modifyStop" &&
      step.then.breakEven &&
      step.stopPrice != null &&
      !markers.some((item) => item.price === step.stopPrice && item.label === "BE")
    ) {
      markers.push({ price: step.stopPrice, label: "BE stop" });
    }
  }
  return markers;
}

/** Pure helper: armed/paused instance → pending manage level markers for chart axis. */
export function manageLevelsFromInstance(instance: PlaybookInstance): ManageLevelMarker[] {
  if (!ACTIVE_MANAGE_STATUSES.has(instance.status)) return [];
  const template = resolvePlaybookTemplateFromInstance(instance);
  if (!template) return [];
  const steps = planPlaybookSteps(template, instance.positionPlan);
  return pendingStepMarkers(instance, steps);
}

export function manageLevelsForSymbol(
  instances: PlaybookInstance[],
  symbol: string,
): ManageLevelMarker[] {
  const normalized = symbol.trim().toUpperCase();
  const match = instances.find(
    (item) =>
      item.positionPlan.symbol === normalized && ACTIVE_MANAGE_STATUSES.has(item.status),
  );
  if (!match) return [];
  return manageLevelsFromInstance(match);
}

const MANAGE_MARKER_COLOR = "#38bdf8";

export function manageLevelsToPriceAxisAnnotations(
  markers: ManageLevelMarker[],
  paneId = "price",
): PriceAxisAnnotation[] {
  return markers.map((marker, index) => ({
    id: `manage-${marker.label}-${marker.price}-${index}`,
    paneId,
    source: "manage" as const,
    value: marker.price,
    label: marker.label,
    color: MANAGE_MARKER_COLOR,
    line: "dashed" as const,
    showLabel: true,
    priority: 35,
  }));
}
