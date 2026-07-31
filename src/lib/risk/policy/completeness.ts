import {
  PLAYBOOK_PRESET_IDS,
  PLAYBOOK_PRESETS,
  type PlaybookPresetId,
} from "@/lib/trading/playbook/presets";

import { playbookTemplateToRiskPolicyTemplate } from "./fromPlaybook";
import {
  hasInheritsSlot,
  isRestingBrokerProtectExit,
  resolveTemplateExits,
  type RiskPolicyTemplate,
} from "./types";

export const TEMPLATE_COMPLETENESS_SLOTS = [
  "scope",
  "budget",
  "sizing",
  "geometry",
  "protectExit",
  "exits",
] as const;

export type TemplateCompletenessSlot = (typeof TEMPLATE_COMPLETENESS_SLOTS)[number];

export type TemplateSlotPresence = "present" | "inherits" | "missing";

export type TemplateCompletenessReport = {
  slots: Record<TemplateCompletenessSlot, TemplateSlotPresence>;
  isTradeComplete: boolean;
  missingForTradeScope: TemplateCompletenessSlot[];
};

function slotPresence(
  present: boolean,
  inherits: boolean,
): TemplateSlotPresence {
  if (present) return "present";
  if (inherits) return "inherits";
  return "missing";
}

/** Structural completeness — distinct from presetRiskPolicy prose checklist. */
export function assessTemplateCompleteness(
  template: RiskPolicyTemplate,
): TemplateCompletenessReport {
  const budgetPresent = template.budget != null && !hasInheritsSlot(template.budget);
  const budgetInherits = template.budget?.kind === "inherits";
  const sizingPresent = template.sizing != null && !hasInheritsSlot(template.sizing);
  const sizingInherits = template.sizing?.kind === "inherits";
  const geometryPresent = template.geometry != null;
  const protectPresent = resolveTemplateExits(template).some(isRestingBrokerProtectExit);

  const slots: Record<TemplateCompletenessSlot, TemplateSlotPresence> = {
    scope: template.scope === "trade" ? "present" : "missing",
    budget: slotPresence(budgetPresent, budgetInherits),
    sizing: slotPresence(sizingPresent, sizingInherits),
    geometry: geometryPresent ? "present" : "missing",
    protectExit: protectPresent ? "present" : "missing",
    exits: template.exits.length > 0 ? "present" : "missing",
  };

  const missingForTradeScope: TemplateCompletenessSlot[] = [];
  if (slots.budget !== "present") missingForTradeScope.push("budget");
  if (slots.geometry !== "present") missingForTradeScope.push("geometry");
  if (slots.protectExit !== "present") missingForTradeScope.push("protectExit");

  const isTradeComplete = missingForTradeScope.length === 0;

  return { slots, isTradeComplete, missingForTradeScope };
}

export function isIncompleteManageOnlyTemplate(template: RiskPolicyTemplate): boolean {
  const report = assessTemplateCompleteness(template);
  return !report.isTradeComplete && report.slots.exits === "present";
}

/** Map shipped Manage presets to incomplete RiskPolicyTemplates. */
export function presetToRiskPolicyTemplate(id: PlaybookPresetId): RiskPolicyTemplate {
  return playbookTemplateToRiskPolicyTemplate(PLAYBOOK_PRESETS[id]);
}

export function allPresetRiskPolicyTemplates(): Record<
  PlaybookPresetId,
  RiskPolicyTemplate
> {
  return Object.fromEntries(
    PLAYBOOK_PRESET_IDS.map((id) => [id, presetToRiskPolicyTemplate(id)]),
  ) as Record<PlaybookPresetId, RiskPolicyTemplate>;
}
