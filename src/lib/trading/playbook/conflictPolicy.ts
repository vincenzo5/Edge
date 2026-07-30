import type {
  PlaybookInstance,
  PlaybookInstanceStatus,
  PlaybookRule,
  PlaybookThen,
  RuleRuntime,
} from "./types";

/** Conflict policy — manual stop drag pauses conflicting manage rules at runtime (Phase 3). */

export const CONFLICT_POLICY = {
  /** User drag-modify on broker stop pauses conflicting manage rules. */
  manualStopDragPausesRules: true,
  /** Detach cancels the playbook instance only — never Protect bracket/OCO legs. */
  detachKeepsProtectOrders: true,
  /** Protect orders always rest at broker; manager only upgrades management. */
  hybridProtectAtBroker: true,
} as const;

export type ConflictEvent =
  | { kind: "manual_stop_drag"; stopPrice: number }
  | { kind: "detach" }
  | { kind: "protective_fill" };

const CONFLICTING_THEN_KINDS: PlaybookThen["kind"][] = ["modifyStop", "attachTrail"];

export function ruleConflictsWithManualStop(rule: PlaybookRule): boolean {
  return CONFLICTING_THEN_KINDS.includes(rule.then.kind);
}

export function rulesToPauseOnManualStopDrag(rules: PlaybookRule[]): string[] {
  return rules.filter(ruleConflictsWithManualStop).map((rule) => rule.id);
}

export function instanceStatusAfterDetach(): PlaybookInstanceStatus {
  return "detached";
}

/** Detach never implies cancel-protect — callers must not route Protect cancels through detach. */
export function detachAffectsProtectOrders(): false {
  return false;
}

/** Pause stops Manage evaluation only — never cancels Protect legs. */
export function pauseAffectsProtectOrders(): false {
  return false;
}

export function shouldPauseOnConflict(event: ConflictEvent, rule: PlaybookRule): boolean {
  if (event.kind === "manual_stop_drag") {
    return ruleConflictsWithManualStop(rule);
  }
  if (event.kind === "detach") {
    return true;
  }
  return false;
}

export function buildManualStopPausePatch(
  instance: PlaybookInstance,
  rules: PlaybookRule[],
): { status: "paused"; ruleRuntimes: RuleRuntime[] } | null {
  const pauseRuleIds = new Set(rulesToPauseOnManualStopDrag(rules));
  if (pauseRuleIds.size === 0) return null;

  let changed = false;
  const ruleRuntimes: RuleRuntime[] = instance.ruleRuntimes.map((item) => {
    if (
      pauseRuleIds.has(item.ruleId) &&
      (item.status === "pending" || item.status === "armed")
    ) {
      changed = true;
      return {
        ...item,
        status: "skipped" as const,
        skippedReason: "manual_stop",
      };
    }
    return item;
  });

  if (!changed) return null;
  return { status: "paused", ruleRuntimes };
}
