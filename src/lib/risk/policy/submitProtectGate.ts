import type { TradingEnvironment } from "@/lib/trading/types";

import { derivePolicyIntegrity } from "./integrity";
import { isRestingBrokerProtectExit, resolveTemplateExits, type RiskPolicyTemplate } from "./types";

export type SubmitProtectGateVerdict =
  | { kind: "allow" }
  | { kind: "soft_warn_paper"; reason: "protect_missing" | "incomplete_template" }
  | { kind: "hard_block_live"; reason: "protect_missing" | "incomplete_template" };

export function evaluateSubmitProtectGate(args: {
  environment: TradingEnvironment;
  template: RiskPolicyTemplate | null | undefined;
  unprotectedConfirm?: boolean;
}): SubmitProtectGateVerdict {
  if (!args.template) {
    if (args.environment === "live" && !args.unprotectedConfirm) {
      return { kind: "hard_block_live", reason: "protect_missing" };
    }
    if (args.environment === "paper") {
      return { kind: "soft_warn_paper", reason: "protect_missing" };
    }
    return { kind: "allow" };
  }

  const hasRestingProtect = resolveTemplateExits(args.template).some(isRestingBrokerProtectExit);
  if (hasRestingProtect) {
    return { kind: "allow" };
  }

  const integrity = derivePolicyIntegrity({ template: args.template });
  const reason =
    integrity === "incomplete_template" ? "incomplete_template" : "protect_missing";

  if (args.environment === "live") {
    if (args.unprotectedConfirm) return { kind: "allow" };
    return { kind: "hard_block_live", reason };
  }

  return { kind: "soft_warn_paper", reason };
}

export function policySnapshotRequiresBracket(
  template: RiskPolicyTemplate | null | undefined,
): boolean {
  if (!template) return false;
  return resolveTemplateExits(template).some(isRestingBrokerProtectExit);
}
