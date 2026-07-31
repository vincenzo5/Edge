import type { OrderSide } from "@/lib/trading/types";

export const LAST_USED_POLICY_BY_SIDE_KEY = "edge:risk:lastUsedPolicyBySide:v1";

export type LastUsedPolicyBySide = {
  long?: string;
  short?: string;
};

const EMPTY: LastUsedPolicyBySide = {};

function sideToKey(side: OrderSide): keyof LastUsedPolicyBySide {
  return side === "BUY" ? "long" : "short";
}

export function parseLastUsedPolicyBySide(raw: string | null): LastUsedPolicyBySide {
  if (!raw) return { ...EMPTY };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed == null) return { ...EMPTY };
    const record = parsed as Record<string, unknown>;
    const result: LastUsedPolicyBySide = {};
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

export function readLastUsedPolicyBySide(): LastUsedPolicyBySide {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(LAST_USED_POLICY_BY_SIDE_KEY);
    return parseLastUsedPolicyBySide(raw);
  } catch {
    return { ...EMPTY };
  }
}

export function writeLastUsedPolicyBySide(value: LastUsedPolicyBySide): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_USED_POLICY_BY_SIDE_KEY, JSON.stringify(value));
  } catch {
    // Ignore quota / privacy mode failures.
  }
}

export function readLastUsedPolicyForSide(side: OrderSide): string | undefined {
  const prefs = readLastUsedPolicyBySide();
  return prefs[sideToKey(side)];
}

export function recordLastUsedPolicy(side: OrderSide, templateId: string): void {
  const trimmed = templateId.trim();
  if (!trimmed) return;
  const current = readLastUsedPolicyBySide();
  writeLastUsedPolicyBySide({
    ...current,
    [sideToKey(side)]: trimmed,
  });
}
