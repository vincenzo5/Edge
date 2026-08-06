import type { OrderSide } from "@/lib/trading/types";

export const DEFAULT_POLICY_BY_SIDE_KEY = "edge:risk:defaultPolicyBySide:v1";

export type DefaultPolicyBySide = {
  long?: string;
  short?: string;
};

const EMPTY: DefaultPolicyBySide = {};

function sideToKey(side: OrderSide): keyof DefaultPolicyBySide {
  return side === "BUY" ? "long" : "short";
}

export function parseDefaultPolicyBySide(raw: string | null): DefaultPolicyBySide {
  if (!raw) return { ...EMPTY };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed == null) return { ...EMPTY };
    const record = parsed as Record<string, unknown>;
    const result: DefaultPolicyBySide = {};
    if (typeof record.long === "string" && record.long.length > 0) {
      result.long = record.long;
    }
    if (typeof record.short === "string" && record.short.length > 0) {
      result.short = record.short;
    }
    return result;
  } catch {
    return { ...EMPTY };
  }
}

export function readDefaultPolicyBySide(): DefaultPolicyBySide {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(DEFAULT_POLICY_BY_SIDE_KEY);
    return parseDefaultPolicyBySide(raw);
  } catch {
    return { ...EMPTY };
  }
}

export function writeDefaultPolicyBySide(value: DefaultPolicyBySide): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEFAULT_POLICY_BY_SIDE_KEY, JSON.stringify(value));
  } catch {
    // Ignore quota / privacy mode failures.
  }
}

export function readDefaultPolicyForSide(side: OrderSide): string | undefined {
  const prefs = readDefaultPolicyBySide();
  return prefs[sideToKey(side)];
}

export function recordDefaultPolicyForSide(side: OrderSide, templateId: string | null): void {
  const current = readDefaultPolicyBySide();
  const key = sideToKey(side);
  if (templateId == null || templateId.trim().length === 0) {
    const next = { ...current };
    delete next[key];
    writeDefaultPolicyBySide(next);
    return;
  }
  writeDefaultPolicyBySide({
    ...current,
    [key]: templateId.trim(),
  });
}
