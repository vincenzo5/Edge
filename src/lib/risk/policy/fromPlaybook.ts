import type { PlaybookRule, PlaybookTemplate } from "@/lib/trading/playbook/types";

import {
  ExitRuleSchema,
  RiskPolicyTemplateSchema,
  type ExitRule,
  type ExitRuleBinding,
  type ExitRuleRole,
  type RiskPolicyTemplate,
} from "./types";

function inferExitRuleRole(rule: PlaybookRule): ExitRuleRole {
  switch (rule.then.kind) {
    case "reduceQty":
      return "takeProfit";
    case "flatten":
      return "flatten";
    case "notify":
      return "manage";
    case "modifyStop":
    case "attachTrail":
    default:
      return "manage";
  }
}

function inferExitRuleBinding(rule: PlaybookRule, role: ExitRuleRole): ExitRuleBinding {
  if (rule.then.kind === "notify") {
    return "notifyOnly";
  }
  if (role === "protect") {
    return "restingBroker";
  }
  return "managedApp";
}

function inferQtyScope(rule: PlaybookRule): ExitRule["qtyScope"] | undefined {
  if (rule.then.kind === "reduceQty") {
    return "fraction";
  }
  if (rule.then.kind === "flatten") {
    return "full";
  }
  return undefined;
}

/** Map a Manage playbook rule to an ExitRule with Phase 0 defaults. */
export function playbookRuleToExitRule(rule: PlaybookRule): ExitRule {
  const role = inferExitRuleRole(rule);
  const binding = inferExitRuleBinding(rule, role);
  const qtyScope = inferQtyScope(rule);
  return ExitRuleSchema.parse({
    ...rule,
    role,
    binding,
    ...(qtyScope ? { qtyScope } : {}),
  });
}

/** Convert a Manage-only PlaybookTemplate to an incomplete RiskPolicyTemplate. */
export function playbookTemplateToRiskPolicyTemplate(
  template: PlaybookTemplate,
): RiskPolicyTemplate {
  return RiskPolicyTemplateSchema.parse({
    id: template.id,
    name: template.name,
    description: template.description,
    schemaVersion: 1,
    scope: "trade",
    budget: { kind: "inherits" },
    sizing: { kind: "inherits" },
    ...(template.geometry ? { geometry: template.geometry } : {}),
    exits: template.rules.map(playbookRuleToExitRule),
    adds: [],
  });
}
