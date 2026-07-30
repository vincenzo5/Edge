import { z } from "zod";
import type { RiskAccount } from "@edge/chart-core";
import type { AccountSummary } from "@/lib/marketData/contracts/brokerage";
import { parseSummaryTagNumber } from "@/lib/marketData/contracts/brokerage";

export const RISK_SETTINGS_STORAGE_KEY = "edge.riskSettings.v1";

export const RiskSizingModeSchema = z.enum(["percent", "absolute"]);

const optionalAccountCapPercent = z.number().positive().max(100).nullish();

export const RiskSettingsSchema = z.object({
  sizingMode: RiskSizingModeSchema,
  riskPercent: z.number().positive().max(100),
  absoluteRisk: z.number().positive().max(10_000_000),
  showLiquidationLine: z.boolean().default(true),
  /** Daily loss kill — % of NetLiq; null/omit = disabled. */
  periodLossCapPercent: optionalAccountCapPercent,
  /** Max concurrent planned risk — % of NetLiq; null/omit = disabled. */
  openHeatCapPercent: optionalAccountCapPercent,
});

export type RiskSizingMode = z.infer<typeof RiskSizingModeSchema>;
export type RiskSettings = z.infer<typeof RiskSettingsSchema>;

export const DEFAULT_RISK_SETTINGS: RiskSettings = {
  sizingMode: "absolute",
  riskPercent: 1,
  absoluteRisk: 1_000,
  showLiquidationLine: true,
};

/** Percent sizing always uses IB NetLiquidation. */
export function resolveAccountBasisValue(account: AccountSummary | null): number | null {
  if (!account) return null;
  return parseSummaryTagNumber(account.tags, "NetLiquidation");
}

/** Pure: settings + account → dollars at risk. Null when unresolvable. */
export function resolveDollarRisk(
  settings: RiskSettings,
  account: AccountSummary | null,
): number | null {
  if (settings.sizingMode === "absolute") {
    return settings.absoluteRisk;
  }
  const basis = resolveAccountBasisValue(account);
  if (basis == null || basis <= 0) return null;
  return Math.round(basis * (settings.riskPercent / 100));
}

/** Bridge to the risk ruler engine's existing type. */
export function toRiskAccount(
  settings: RiskSettings,
  account: AccountSummary | null,
): RiskAccount {
  const capital = resolveAccountBasisValue(account) ?? 0;
  return { capital, riskPercent: settings.riskPercent };
}

function migrateLegacyRiskSettings(raw: Record<string, unknown>): unknown {
  const { manualCapital: _manualCapital, accountBasis: _accountBasis, ...rest } = raw;
  return rest;
}

/** Defensive parse for localStorage loads; falls back to defaults on any error. */
export function parseRiskSettings(raw: unknown): RiskSettings {
  const migrated =
    raw != null && typeof raw === "object" && !Array.isArray(raw)
      ? migrateLegacyRiskSettings(raw as Record<string, unknown>)
      : raw;
  const parsed = RiskSettingsSchema.safeParse(migrated);
  return parsed.success ? parsed.data : DEFAULT_RISK_SETTINGS;
}

export function loadRiskSettingsFromStorage(): RiskSettings {
  if (typeof window === "undefined") return DEFAULT_RISK_SETTINGS;
  try {
    const raw = window.localStorage.getItem(RISK_SETTINGS_STORAGE_KEY);
    if (raw == null) return DEFAULT_RISK_SETTINGS;
    return parseRiskSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_RISK_SETTINGS;
  }
}

export function saveRiskSettingsToStorage(settings: RiskSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RISK_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    void import("@/lib/userPreferences/userPreferencesSync").then(({ notifyUserPreferencesChanged }) =>
      notifyUserPreferencesChanged(),
    );
  } catch {
    /* quota / private mode */
  }
}
