import { assessTemplateCompleteness, TEMPLATE_COMPLETENESS_SLOTS } from "./completeness";
import { playbookRuleToExitRule } from "./fromPlaybook";
import {
  ExitRuleSchema,
  isRestingBrokerProtectExit,
  resolveTemplateExits,
  RiskPolicyTemplateSchema,
  type RiskPolicyTemplate,
} from "./types";
import type { PlaybookTemplate } from "@/lib/trading/playbook/types";

export const COMPLETENESS_SLOT_LABELS: Record<(typeof TEMPLATE_COMPLETENESS_SLOTS)[number], string> = {
  scope: "Scope",
  budget: "Budget",
  sizing: "Sizing",
  geometry: "Geometry",
  protectExit: "Protect",
  exits: "Exits",
};

/** Map a playbook template draft to a RiskPolicyTemplate for completeness review. */
export function playbookTemplateToRiskPolicyTemplateFull(
  template: PlaybookTemplate,
): RiskPolicyTemplate {
  const rawExits = template.exits ?? template.rules;
  const exits = rawExits.map((rule) =>
    rule.role != null || rule.binding != null
      ? ExitRuleSchema.parse(rule)
      : playbookRuleToExitRule(rule),
  );
  return RiskPolicyTemplateSchema.parse({
    id: template.id,
    name: template.name,
    description: template.description,
    schemaVersion: template.schemaVersion ?? 1,
    scope: template.scope ?? "trade",
    budget: template.budget,
    sizing: template.sizing,
    geometry: template.geometry,
    exits,
    gates: template.gates,
    adds: [],
    defaultEntrySchedule: template.defaultEntrySchedule,
    defaultEntryOrder: template.defaultEntryOrder,
  });
}

export function policyTemplateFailureModeCopy(template: RiskPolicyTemplate): string {
  const report = assessTemplateCompleteness(template);
  if (!report.isTradeComplete) {
    return "Incomplete for trade scope — add budget, geometry, and a resting Protect exit.";
  }
  const hasProtect = resolveTemplateExits(template).some(isRestingBrokerProtectExit);
  if (!hasProtect) {
    return "Manage-only recipe — add a resting broker Protect exit for live trades.";
  }
  return "Broker stop stays live if Edge is down.";
}
