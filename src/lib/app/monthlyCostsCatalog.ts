import type { ServerHealthPayload } from "@/lib/marketData/health";

export type MonthlyCostKind = "fixed" | "free" | "usage";

export type MonthlyCostConfiguredFrom =
  | "massive"
  | "fmp"
  | "fred"
  | "tws"
  | "always"
  | "manual"
  | "inactive"
  | "none";

export type MonthlyCostRow = {
  id: string;
  kind: MonthlyCostKind;
  service: string;
  planLabel: string;
  usedFor: string;
  monthlyUsd: number | null;
  configuredFrom: MonthlyCostConfiguredFrom;
};

export type MonthlyCostConfiguredStatus =
  | "configured"
  | "not-configured"
  | "manual"
  | "included"
  | "inactive";

export const MONTHLY_COSTS_CATALOG: readonly MonthlyCostRow[] = [
  {
    id: "massive-options",
    kind: "fixed",
    service: "Massive · Options",
    planLabel: "Advanced",
    usedFor: "Options expirations and chain snapshots",
    monthlyUsd: 199,
    configuredFrom: "inactive",
  },
  {
    id: "massive-stocks",
    kind: "fixed",
    service: "Massive · Stocks",
    planLabel: "Developer",
    usedFor: "Universe screener and daily market summary",
    monthlyUsd: 79,
    configuredFrom: "massive",
  },
  {
    id: "fmp",
    kind: "fixed",
    service: "FMP",
    planLabel: "Premium",
    usedFor: "Screener, movers, fundamentals, calendars",
    monthlyUsd: 69,
    configuredFrom: "fmp",
  },
  {
    id: "ib-market-data",
    kind: "fixed",
    service: "IB market data",
    planLabel: "Exchange packs",
    usedFor: "Live TWS quotes when Gateway is enabled",
    monthlyUsd: null,
    configuredFrom: "manual",
  },
  {
    id: "yahoo",
    kind: "free",
    service: "Yahoo Finance",
    planLabel: "Public API",
    usedFor: "Candle and quote fallback, search",
    monthlyUsd: 0,
    configuredFrom: "always",
  },
  {
    id: "fred",
    kind: "free",
    service: "FRED",
    planLabel: "Public API",
    usedFor: "Macro series and event enrichment",
    monthlyUsd: 0,
    configuredFrom: "fred",
  },
  {
    id: "sec",
    kind: "free",
    service: "SEC EDGAR",
    planLabel: "Public API",
    usedFor: "Filings",
    monthlyUsd: 0,
    configuredFrom: "always",
  },
  {
    id: "postgres-local",
    kind: "free",
    service: "Postgres",
    planLabel: "Local Docker",
    usedFor: "Workspace and layout sync",
    monthlyUsd: 0,
    configuredFrom: "always",
  },
  {
    id: "redis-local",
    kind: "free",
    service: "Redis",
    planLabel: "Local Docker",
    usedFor: "Market-data cache",
    monthlyUsd: 0,
    configuredFrom: "always",
  },
  {
    id: "openrouter",
    kind: "usage",
    service: "OpenRouter",
    planLabel: "Copilot AI",
    usedFor: "In-app Copilot chat and model routing",
    monthlyUsd: null,
    configuredFrom: "none",
  },
] as const;

function isProviderConfigured(
  health: ServerHealthPayload | null,
  providerId: string,
): boolean {
  return Boolean(health?.providers.some((row) => row.id === providerId && row.configured));
}

export function resolveConfiguredStatus(
  row: MonthlyCostRow,
  health: ServerHealthPayload | null,
): MonthlyCostConfiguredStatus {
  switch (row.configuredFrom) {
    case "always":
      return "included";
    case "manual":
      return "manual";
    case "inactive":
      return "inactive";
    case "none":
      return "not-configured";
    case "massive":
      return isProviderConfigured(health, "massive") ? "configured" : "not-configured";
    case "fmp":
      return isProviderConfigured(health, "fmp") ? "configured" : "not-configured";
    case "fred":
      return isProviderConfigured(health, "fred") ? "configured" : "not-configured";
    case "tws":
      return isProviderConfigured(health, "tws") ? "configured" : "not-configured";
    default:
      return "not-configured";
  }
}

export function isConfiguredForTotal(row: MonthlyCostRow, health: ServerHealthPayload | null): boolean {
  return resolveConfiguredStatus(row, health) === "configured";
}

export function sumConfiguredFixed(
  rows: readonly MonthlyCostRow[],
  health: ServerHealthPayload | null,
): number {
  return rows.reduce((total, row) => {
    if (row.kind !== "fixed") return total;
    if (row.monthlyUsd == null) return total;
    if (!isConfiguredForTotal(row, health)) return total;
    return total + row.monthlyUsd;
  }, 0);
}

export function formatUsd(amount: number | null): string {
  if (amount == null) return "$—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function monthlyCostsByKind(kind: MonthlyCostKind): MonthlyCostRow[] {
  return MONTHLY_COSTS_CATALOG.filter((row) => row.kind === kind);
}
