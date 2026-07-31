import {
  detachAffectsProtectOrders,
  pauseAffectsProtectOrders,
} from "@/lib/trading/playbook/conflictPolicy";

import { assessTemplateCompleteness } from "./completeness";
import {
  isRestingBrokerProtectExit,
  resolveTemplateExits,
  type ProtectState,
  type RiskPolicyTemplate,
} from "./types";

export type PolicyIntegrityVerdict =
  | "ok"
  | "protect_missing"
  | "protect_unknown"
  | "incomplete_template";

export type PolicyIntegrityInput = {
  template: RiskPolicyTemplate;
  protectState?: ProtectState;
  /** When true, unknown/stale protectState yields protect_unknown. */
  requireProtectObservation?: boolean;
};

export function derivePolicyIntegrity(input: PolicyIntegrityInput): PolicyIntegrityVerdict {
  const completeness = assessTemplateCompleteness(input.template);
  if (!completeness.isTradeComplete) {
    return "incomplete_template";
  }

  const hasRestingProtectExit = resolveTemplateExits(input.template).some(
    isRestingBrokerProtectExit,
  );
  if (!hasRestingProtectExit) {
    return "protect_missing";
  }

  const { protectState } = input;
  if (input.requireProtectObservation) {
    if (protectState == null || protectState === "unknown") {
      return "protect_unknown";
    }
    if (protectState === "missing" || protectState === "cancelled") {
      return "protect_missing";
    }
    if (protectState === "partial") {
      return "protect_unknown";
    }
  }

  if (protectState === "missing" || protectState === "cancelled") {
    return "protect_missing";
  }

  if (protectState === "unknown" || protectState === "partial") {
    return "protect_unknown";
  }

  if (protectState === "resting") {
    return "ok";
  }

  // Template structurally complete with protect exit declared — observation optional.
  return "ok";
}

/** Pause / Detach never cancel Protect — re-export conflict policy invariants. */
export {
  detachAffectsProtectOrders,
  pauseAffectsProtectOrders,
} from "@/lib/trading/playbook/conflictPolicy";

export function manualOffPreservesProtect(): boolean {
  return !pauseAffectsProtectOrders() && !detachAffectsProtectOrders();
}
