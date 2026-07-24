import type { PlaybookInstance, PlaybookRule } from "./types";
import { getPlaybookPreset } from "./presets";
import { resolvePlaybookTemplateFromInstance } from "./resolveTemplate";
import { priceAtMultipleOfR } from "./types";

export function formatPlaybookStatusToken(status: PlaybookInstance["status"]): string {
  if (status === "pending_fill") return "pending";
  return status;
}

export function resolvePlaybookPresetName(templateId: string): string {
  return getPlaybookPreset(templateId)?.name ?? templateId;
}

export function resolvePlaybookTemplateName(instance: PlaybookInstance): string {
  return resolvePlaybookTemplateFromInstance(instance)?.name ?? instance.templateId;
}

export function formatPlaybookManageLabel(instance: PlaybookInstance): string {
  const presetName = resolvePlaybookTemplateName(instance);
  return `Manage: ${presetName} · ${formatPlaybookStatusToken(instance.status)}`;
}

function sortedRules(rules: PlaybookRule[]): PlaybookRule[] {
  return [...rules].sort(
    (a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER),
  );
}

export function resolveNextManageRule(instance: PlaybookInstance): PlaybookRule | null {
  const template = resolvePlaybookTemplateFromInstance(instance);
  if (!template) return null;
  return (
    sortedRules(template.rules).find((rule) => {
      const runtime = instance.ruleRuntimes.find((item) => item.ruleId === rule.id);
      return runtime?.status === "pending" || runtime?.status === "armed";
    }) ?? null
  );
}

function formatRuleShortLabel(rule: PlaybookRule): string {
  if (rule.then.kind === "modifyStop" && rule.then.breakEven) return "BE";
  if (rule.then.kind === "reduceQty") return "scale";
  if (rule.then.kind === "attachTrail") return "trail";
  return rule.label ?? rule.id;
}

export function formatNextManageDistance(
  instance: PlaybookInstance,
  lastPrice: number | null,
): string | null {
  const rule = resolveNextManageRule(instance);
  if (!rule) return null;

  if (rule.when.kind === "scaleFill") {
    const targetId = rule.when.ruleId;
    if (!targetId) return "After prior scale";
    const prior = instance.ruleRuntimes.find((item) => item.ruleId === targetId);
    if (prior?.status !== "fired") return "After prior scale";
    return formatRuleShortLabel(rule);
  }

  if (rule.when.kind === "multipleOfR") {
    const trigger = priceAtMultipleOfR(instance.positionPlan, rule.when.multiple);
    const label = formatRuleShortLabel(rule);
    if (lastPrice == null) {
      return `+${rule.when.multiple}R to ${label}`;
    }
    const plan = instance.positionPlan;
    const remainingR =
      plan.side === "BUY"
        ? (trigger - lastPrice) / plan.rUnit
        : (lastPrice - trigger) / plan.rUnit;
    if (remainingR <= 0) return null;
    return `+${remainingR.toFixed(1)}R to ${label}`;
  }

  if (rule.when.kind === "priceCross") {
    if (lastPrice == null) return `Cross ${rule.when.price.toFixed(2)} → ${formatRuleShortLabel(rule)}`;
    const delta = Math.abs(rule.when.price - lastPrice);
    return `${delta.toFixed(2)} to ${formatRuleShortLabel(rule)}`;
  }

  return rule.label ?? rule.id;
}

export function formatManageStepPreview(step: {
  label: string;
  triggerPrice?: number;
  stopPrice?: number;
  reduceQty?: number;
  then: { kind: string; breakEven?: boolean };
}): string {
  const trigger =
    step.triggerPrice != null ? ` at ${step.triggerPrice.toFixed(2)}` : "";
  if (step.then.kind === "modifyStop" && step.then.breakEven) {
    return `${step.label}${trigger} → stop to entry`;
  }
  if (step.then.kind === "reduceQty" && step.reduceQty != null) {
    return `${step.label}${trigger} → reduce ${step.reduceQty} shares`;
  }
  if (step.then.kind === "attachTrail") {
    return `${step.label}${trigger} → trail remainder`;
  }
  if (step.then.kind === "flatten") {
    return `${step.label} → flatten`;
  }
  if (step.then.kind === "notify") {
    return `${step.label}${trigger} → notify`;
  }
  if (step.stopPrice != null) {
    return `${step.label}${trigger} → stop ${step.stopPrice.toFixed(2)}`;
  }
  return step.label;
}

export function findActivePlaybookForPosition(
  instances: PlaybookInstance[],
  symbol: string,
  accountId: string,
): PlaybookInstance | null {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const normalizedAccountId = accountId.trim();
  return (
    instances.find(
      (item) =>
        item.positionPlan.symbol === normalizedSymbol &&
        item.positionPlan.accountId === normalizedAccountId &&
        (item.status === "pending_fill" ||
          item.status === "armed" ||
          item.status === "paused"),
    ) ?? null
  );
}
