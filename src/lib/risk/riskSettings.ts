import { z } from "zod";
import type { RiskAccount } from "@edge/chart-core";
import type { AccountSummary } from "@/lib/marketData/contracts/brokerage";
import { parseSummaryTagNumber } from "@/lib/marketData/contracts/brokerage";

export const RISK_SETTINGS_STORAGE_KEY = "edge.riskSettings.v1";

export const RiskSizingModeSchema = z.enum(["percent", "absolute"]);
export const RiskAccountBasisSchema = z.enum([
  "NetLiquidation",
  "AvailableFunds",
  "EquityWithLoanValue",
  "Manual",
]);

export const RiskSettingsSchema = z.object({
  sizingMode: RiskSizingModeSchema,
  riskPercent: z.number().positive().max(100),
  absoluteRisk: z.number().positive().max(10_000_000),
  accountBasis: RiskAccountBasisSchema.default("NetLiquidation"),
  manualCapital: z.number().nonnegative().max(1_000_000_000),
});

export type RiskSizingMode = z.infer<typeof RiskSizingModeSchema>;
export type RiskAccountBasis = z.infer<typeof RiskAccountBasisSchema>;
export type RiskSettings = z.infer<typeof RiskSettingsSchema>;

export const DEFAULT_RISK_SETTINGS: RiskSettings = {
  sizingMode: "percent",
  riskPercent: 1,
  absoluteRisk: 1_000,
  accountBasis: "NetLiquidation",
  manualCapital: 50_000,
};

/** Returns the $ value backing the chosen basis, or null if unavailable. */
export function resolveAccountBasisValue(
  settings: RiskSettings,
  account: AccountSummary | null,
): number | null {
  if (settings.accountBasis === "Manual") {
    return settings.manualCapital > 0 ? settings.manualCapital : null;
  }
  if (!account) return null;
  return parseSummaryTagNumber(account.tags, settings.accountBasis);
}

/** Pure: settings + account → dollars at risk. Null when unresolvable. */
export function resolveDollarRisk(
  settings: RiskSettings,
  account: AccountSummary | null,
): number | null {
  if (settings.sizingMode === "absolute") {
    return settings.absoluteRisk;
  }
  const basis = resolveAccountBasisValue(settings, account);
  if (basis == null || basis <= 0) return null;
  return Math.round(basis * (settings.riskPercent / 100));
}

/** Bridge to the risk ruler engine's existing type. */
export function toRiskAccount(
  settings: RiskSettings,
  account: AccountSummary | null,
): RiskAccount {
  const capital = resolveAccountBasisValue(settings, account) ?? settings.manualCapital;
  return { capital, riskPercent: settings.riskPercent };
}

/** Defensive parse for localStorage loads; falls back to defaults on any error. */
export function parseRiskSettings(raw: unknown): RiskSettings {
  const parsed = RiskSettingsSchema.safeParse(raw);
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
  } catch {
    /* quota / private mode */
  }
}

export const RISK_ACCOUNT_BASIS_LABELS: Record<RiskAccountBasis, string> = {
  NetLiquidation: "Net liquidation",
  AvailableFunds: "Available funds",
  EquityWithLoanValue: "Equity with loan",
  Manual: "Manual capital",
};
