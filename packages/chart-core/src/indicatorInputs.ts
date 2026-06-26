import type { IndicatorConfig } from './contracts';
import type { IndicatorPlugin, InputValue, ParamDef, ResolvedInputs } from './plugin-api';

/** Normalize legacy numeric-only paramSchema entries to discriminated union. */
function normalizeParamDef(def: ParamDef | { label: string; default: number; min?: number; max?: number; step?: number }): ParamDef {
  if ('kind' in def) return def;
  return {
    kind: 'number',
    label: def.label,
    default: def.default,
    min: def.min,
    max: def.max,
    step: def.step,
  };
}

export function getInputSchema(
  plugin: IndicatorPlugin,
): Record<string, ParamDef> | undefined {
  if (plugin.inputSchema) return plugin.inputSchema;
  if (!plugin.paramSchema) return undefined;
  return Object.fromEntries(
    Object.entries(plugin.paramSchema).map(([key, def]) => [key, normalizeParamDef(def)]),
  );
}

function schemaDefault(def: ParamDef): InputValue {
  return def.default;
}

function coerceLegacyParam(
  key: string,
  def: ParamDef,
  params: Record<string, number> | undefined,
): InputValue | undefined {
  const raw = params?.[key];
  if (raw == null || !Number.isFinite(raw)) return undefined;
  if (def.kind === 'number') return raw;
  if (def.kind === 'boolean') return raw !== 0;
  if (def.kind === 'enum' || def.kind === 'source') {
    if (def.kind === 'source') {
      const s = String(raw);
      const allowed = ['close', 'open', 'high', 'low', 'hlc3', 'ohlcv'] as const;
      return allowed.includes(s as (typeof allowed)[number]) ? s : def.default;
    }
    return def.options.some((o) => o.value === String(raw)) ? String(raw) : def.default;
  }
  return raw;
}

export function clampInputValue(value: InputValue, def: ParamDef): InputValue {
  if (def.kind === 'number') {
    let v = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(v)) v = def.default;
    if (def.min != null) v = Math.max(def.min, v);
    if (def.max != null) v = Math.min(def.max, v);
    if (def.step != null && def.step > 0) {
      const base = def.min ?? 0;
      v = base + Math.round((v - base) / def.step) * def.step;
    }
    return v;
  }
  if (def.kind === 'boolean') {
    return typeof value === 'boolean' ? value : Boolean(value);
  }
  if (def.kind === 'enum') {
    const s = String(value);
    return def.options.some((o) => o.value === s) ? s : def.default;
  }
  if (def.kind === 'source') {
    const s = String(value);
    const allowed = ['close', 'open', 'high', 'low', 'hlc3', 'ohlcv'] as const;
    return allowed.includes(s as (typeof allowed)[number]) ? s : def.default;
  }
  return value;
}

/** Single source of truth: schema defaults → instance.inputs → legacy params. */
export function resolveIndicatorInputs(
  plugin: IndicatorPlugin,
  instance: Pick<IndicatorConfig, 'inputs' | 'params'>,
): ResolvedInputs {
  const schema = getInputSchema(plugin);
  const defaults = plugin.defaultInputs ?? plugin.defaultParams;
  const resolved: ResolvedInputs = {};

  if (schema) {
    for (const [key, def] of Object.entries(schema)) {
      const fromInputs = instance.inputs?.[key];
      const fromLegacy = coerceLegacyParam(key, def, instance.params);
      const merged =
        fromInputs !== undefined
          ? fromInputs
          : fromLegacy !== undefined
            ? fromLegacy
            : defaults?.[key] ?? schemaDefault(def);
      resolved[key] = clampInputValue(merged, def);
    }
    return resolved;
  }

  if (defaults) {
    for (const [key, value] of Object.entries(defaults)) {
      resolved[key] = instance.inputs?.[key] ?? instance.params?.[key] ?? value;
    }
  } else if (instance.inputs) {
    Object.assign(resolved, instance.inputs);
  } else if (instance.params) {
    for (const [key, value] of Object.entries(instance.params)) {
      resolved[key] = value;
    }
  }

  return resolved;
}

export function stableStringifyInputs(inputs: ResolvedInputs): string {
  const keys = Object.keys(inputs).sort();
  return JSON.stringify(keys.map((k) => [k, inputs[k]]));
}

export function defaultInputsFromSchema(plugin: IndicatorPlugin): Record<string, InputValue> | undefined {
  const schema = getInputSchema(plugin);
  if (!schema) return plugin.defaultInputs ? { ...plugin.defaultInputs } : undefined;
  const out: Record<string, InputValue> = {};
  for (const [key, def] of Object.entries(schema)) {
    out[key] = plugin.defaultInputs?.[key] ?? plugin.defaultParams?.[key] ?? schemaDefault(def);
  }
  return out;
}
