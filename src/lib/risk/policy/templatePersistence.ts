import type { PlaybookRule, PlaybookTemplate } from "@/lib/trading/playbook/types";

import type { ExitRule, RiskPolicyTemplate } from "./types";

/** Managed-app exits become playbook rules for evaluator back-compat. */
export function managedAppRulesFromExits(exits: ExitRule[]): PlaybookRule[] {
  return exits.filter((rule) => (rule.binding ?? "managedApp") === "managedApp");
}

/** When persisting template slots, dual-write rules from managedApp exits. */
export function dualWriteTemplateRules(template: PlaybookTemplate): PlaybookRule[] {
  if (template.exits && template.exits.length > 0) {
    const managed = managedAppRulesFromExits(template.exits as ExitRule[]);
    if (managed.length > 0) {
      return managed;
    }
  }
  return template.rules;
}

export function riskPolicyTemplateToPlaybookTemplate(
  template: RiskPolicyTemplate,
): PlaybookTemplate {
  const managedRules = managedAppRulesFromExits(template.exits);
  return {
    id: template.id,
    name: template.name,
    description: template.description ?? template.name,
    rules: managedRules.length > 0 ? managedRules : template.exits,
    schemaVersion: template.schemaVersion,
    scope: template.scope,
    budget: template.budget,
    sizing: template.sizing,
    geometry: template.geometry,
    exits: template.exits,
    gates: template.gates,
    defaultEntrySchedule: template.defaultEntrySchedule,
    defaultEntryOrder: template.defaultEntryOrder,
  };
}
