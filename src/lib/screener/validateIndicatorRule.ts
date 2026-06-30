import type {
  IndicatorPlugin,
  ParamDef,
  PriceSource,
} from "@edge/chart-core";
import type {
  IndicatorTechnicalRule,
  TechnicalRule,
} from "@/lib/marketData/schemas/request";

const VALID_OPS = new Set([">", ">=", "<", "<=", "=="]);
const PRICE_SOURCES = new Set<PriceSource>([
  "close",
  "open",
  "high",
  "low",
  "hlc3",
  "ohlcv",
]);

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

function fail(errors: string[]): ValidationResult {
  return { ok: false, errors };
}

function validateInputValue(
  key: string,
  value: unknown,
  def: ParamDef,
  errors: string[],
): void {
  switch (def.kind) {
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        errors.push(`Input "${key}" must be a finite number`);
        return;
      }
      if (def.min != null && value < def.min) {
        errors.push(`Input "${key}" must be >= ${def.min}`);
      }
      if (def.max != null && value > def.max) {
        errors.push(`Input "${key}" must be <= ${def.max}`);
      }
      return;
    }
    case "enum": {
      if (typeof value !== "string") {
        errors.push(`Input "${key}" must be a string`);
        return;
      }
      if (!def.options.some((option) => option.value === value)) {
        errors.push(`Input "${key}" must be one of: ${def.options.map((o) => o.value).join(", ")}`);
      }
      return;
    }
    case "boolean": {
      if (typeof value !== "boolean") {
        errors.push(`Input "${key}" must be a boolean`);
      }
      return;
    }
    case "source": {
      if (typeof value !== "string" || !PRICE_SOURCES.has(value as PriceSource)) {
        errors.push(`Input "${key}" must be a valid price source`);
      }
      return;
    }
    default:
      break;
  }
}

export function validateIndicatorRule(
  rule: IndicatorTechnicalRule,
  registry: IndicatorPlugin[],
): ValidationResult {
  const errors: string[] = [];

  const plugin = registry.find((entry) => entry.name === rule.indicator);
  if (!plugin || typeof plugin.compute !== "function") {
    errors.push(`Indicator "${rule.indicator}" is not implemented`);
    return fail(errors);
  }

  const outputKeys = new Set(
    (plugin.outputs ?? []).map((output) => output.key).filter(Boolean),
  );
  if (!outputKeys.has(rule.series)) {
    errors.push(
      `Series "${rule.series}" is not valid for ${rule.indicator}; expected one of: ${[...outputKeys].join(", ") || "(none)"}`,
    );
  }

  const schema = plugin.inputSchema ?? {};
  const inputs = rule.inputs ?? {};
  for (const [key, value] of Object.entries(inputs)) {
    const def = schema[key];
    if (!def) {
      errors.push(`Unknown input "${key}" for ${rule.indicator}`);
      continue;
    }
    validateInputValue(key, value, def, errors);
  }

  if (!VALID_OPS.has(rule.op)) {
    errors.push(`Operator "${rule.op}" is not supported`);
  }

  if (typeof rule.threshold !== "number" || !Number.isFinite(rule.threshold)) {
    errors.push("Threshold must be a finite number");
  }

  if (rule.transform) {
    if (rule.indicator !== "BOLL") {
      errors.push(`Transform "${rule.transform.kind}" is only supported for BOLL`);
    } else if (rule.transform.kind !== "bollPctB") {
      errors.push(`Unknown transform "${rule.transform.kind}"`);
    }
  }

  return errors.length > 0 ? fail(errors) : { ok: true };
}

export function validateScreenQueryTechnical(
  technical: TechnicalRule | undefined,
  registry: IndicatorPlugin[],
): ValidationResult {
  if (!technical) return { ok: true };
  if (technical.kind !== "indicator") return { ok: true };
  return validateIndicatorRule(technical, registry);
}

export function formatTechnicalRuleSummary(technical: TechnicalRule): string {
  switch (technical.kind) {
    case "rsi":
      if (technical.max != null) {
        return `RSI(${technical.period ?? 14}) ≤ ${technical.max}`;
      }
      if (technical.min != null) {
        return `RSI(${technical.period ?? 14}) ≥ ${technical.min}`;
      }
      return `RSI(${technical.period ?? 14})`;
    case "goldenCross":
      return `Golden cross (SMA${technical.fast ?? 50} > SMA${technical.slow ?? 200})`;
    case "fiftyTwoWeekProximity":
      return `Near 52-week high (≤${Math.round((technical.withinPct ?? 0.05) * 100)}%)`;
    case "indicator": {
      const inputs = technical.inputs
        ? Object.values(technical.inputs)
            .filter((value) => typeof value === "number")
            .join(",")
        : "";
      const prefix = inputs ? `${technical.indicator}(${inputs})` : technical.indicator;
      const transform =
        technical.transform?.kind === "bollPctB" ? " %B" : "";
      return `${prefix}${transform} ${technical.series} ${technical.op} ${technical.threshold}`;
    }
    default:
      return "Technical rule";
  }
}
