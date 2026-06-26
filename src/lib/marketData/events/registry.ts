import type { EventFamily, EventImportance } from "../contracts/events";

export type CanonicalEventId =
  | "earnings"
  | "dividend"
  | "split"
  | "sec_8k"
  | "sec_10q"
  | "sec_10k"
  | "sec_filing"
  | "fomc_rate_decision"
  | "fomc_minutes"
  | "cpi"
  | "core_cpi"
  | "pce"
  | "core_pce"
  | "nonfarm_payrolls"
  | "unemployment_rate"
  | "average_hourly_earnings"
  | "gdp"
  | "ism_manufacturing"
  | "ism_services"
  | "retail_sales";

export type ProviderPath = {
  provider: "fmp" | "sec" | "fred" | "economic_calendar";
  capability: string;
};

export type CanonicalEventDefinition = {
  id: CanonicalEventId;
  family: EventFamily;
  title: string;
  importance: EventImportance;
  providerPaths: ProviderPath[];
  /** Substrings matched case-insensitively against FRED release names. */
  fredReleasePatterns?: string[];
  /** SEC form types that map to this canonical event. */
  secFormTypes?: string[];
};

export const CANONICAL_EVENT_REGISTRY: readonly CanonicalEventDefinition[] = [
  {
    id: "earnings",
    family: "corporate",
    title: "Earnings",
    importance: "high",
    providerPaths: [{ provider: "fmp", capability: "corporate_events" }],
  },
  {
    id: "dividend",
    family: "corporate",
    title: "Dividend",
    importance: "medium",
    providerPaths: [{ provider: "fmp", capability: "corporate_events" }],
  },
  {
    id: "split",
    family: "corporate",
    title: "Stock Split",
    importance: "medium",
    providerPaths: [{ provider: "fmp", capability: "corporate_events" }],
  },
  {
    id: "sec_8k",
    family: "filing",
    title: "SEC 8-K",
    importance: "high",
    providerPaths: [
      { provider: "sec", capability: "recent_filings" },
      { provider: "fmp", capability: "sec_filings" },
    ],
    secFormTypes: ["8-K", "8-K/A"],
  },
  {
    id: "sec_10q",
    family: "filing",
    title: "SEC 10-Q",
    importance: "medium",
    providerPaths: [
      { provider: "sec", capability: "recent_filings" },
      { provider: "fmp", capability: "sec_filings" },
    ],
    secFormTypes: ["10-Q", "10-Q/A"],
  },
  {
    id: "sec_10k",
    family: "filing",
    title: "SEC 10-K",
    importance: "high",
    providerPaths: [
      { provider: "sec", capability: "recent_filings" },
      { provider: "fmp", capability: "sec_filings" },
    ],
    secFormTypes: ["10-K", "10-K/A"],
  },
  {
    id: "sec_filing",
    family: "filing",
    title: "SEC Filing",
    importance: "low",
    providerPaths: [
      { provider: "sec", capability: "recent_filings" },
      { provider: "fmp", capability: "sec_filings" },
    ],
  },
  {
    id: "fomc_rate_decision",
    family: "macro",
    title: "FOMC Rate Decision",
    importance: "high",
    providerPaths: [
      { provider: "fred", capability: "releases" },
      { provider: "economic_calendar", capability: "macro_events" },
    ],
    fredReleasePatterns: ["federal funds", "fomc", "interest rate decision"],
  },
  {
    id: "fomc_minutes",
    family: "macro",
    title: "FOMC Minutes",
    importance: "high",
    providerPaths: [
      { provider: "fred", capability: "releases" },
      { provider: "economic_calendar", capability: "macro_events" },
    ],
    fredReleasePatterns: ["fomc minutes"],
  },
  {
    id: "cpi",
    family: "macro",
    title: "CPI",
    importance: "high",
    providerPaths: [
      { provider: "fred", capability: "releases" },
      { provider: "economic_calendar", capability: "macro_events" },
    ],
    fredReleasePatterns: ["consumer price index", "cpi"],
  },
  {
    id: "core_cpi",
    family: "macro",
    title: "Core CPI",
    importance: "high",
    providerPaths: [
      { provider: "fred", capability: "releases" },
      { provider: "economic_calendar", capability: "macro_events" },
    ],
    fredReleasePatterns: ["core consumer price", "core cpi"],
  },
  {
    id: "pce",
    family: "macro",
    title: "PCE",
    importance: "high",
    providerPaths: [
      { provider: "fred", capability: "releases" },
      { provider: "economic_calendar", capability: "macro_events" },
    ],
    fredReleasePatterns: ["personal consumption expenditures", "pce price index"],
  },
  {
    id: "core_pce",
    family: "macro",
    title: "Core PCE",
    importance: "high",
    providerPaths: [
      { provider: "fred", capability: "releases" },
      { provider: "economic_calendar", capability: "macro_events" },
    ],
    fredReleasePatterns: ["core pce"],
  },
  {
    id: "nonfarm_payrolls",
    family: "macro",
    title: "Nonfarm Payrolls",
    importance: "high",
    providerPaths: [
      { provider: "fred", capability: "releases" },
      { provider: "economic_calendar", capability: "macro_events" },
    ],
    fredReleasePatterns: ["employment situation", "nonfarm payroll", "nonfarm employment"],
  },
  {
    id: "unemployment_rate",
    family: "macro",
    title: "Unemployment Rate",
    importance: "high",
    providerPaths: [
      { provider: "fred", capability: "releases" },
      { provider: "economic_calendar", capability: "macro_events" },
    ],
    fredReleasePatterns: ["unemployment rate", "employment situation"],
  },
  {
    id: "average_hourly_earnings",
    family: "macro",
    title: "Average Hourly Earnings",
    importance: "medium",
    providerPaths: [
      { provider: "fred", capability: "releases" },
      { provider: "economic_calendar", capability: "macro_events" },
    ],
    fredReleasePatterns: ["average hourly earnings", "employment situation"],
  },
  {
    id: "gdp",
    family: "macro",
    title: "GDP",
    importance: "high",
    providerPaths: [
      { provider: "fred", capability: "releases" },
      { provider: "economic_calendar", capability: "macro_events" },
    ],
    fredReleasePatterns: ["gross domestic product", "gdp"],
  },
  {
    id: "ism_manufacturing",
    family: "macro",
    title: "ISM Manufacturing PMI",
    importance: "medium",
    providerPaths: [
      { provider: "fred", capability: "releases" },
      { provider: "economic_calendar", capability: "macro_events" },
    ],
    fredReleasePatterns: ["ism manufacturing", "manufacturing pmi"],
  },
  {
    id: "ism_services",
    family: "macro",
    title: "ISM Services PMI",
    importance: "medium",
    providerPaths: [
      { provider: "fred", capability: "releases" },
      { provider: "economic_calendar", capability: "macro_events" },
    ],
    fredReleasePatterns: ["ism services", "services pmi", "non-manufacturing"],
  },
  {
    id: "retail_sales",
    family: "macro",
    title: "Retail Sales",
    importance: "medium",
    providerPaths: [
      { provider: "fred", capability: "releases" },
      { provider: "economic_calendar", capability: "macro_events" },
    ],
    fredReleasePatterns: ["retail sales"],
  },
] as const;

export const PRIORITY_ONE_MACRO_IDS: readonly CanonicalEventId[] = [
  "fomc_rate_decision",
  "fomc_minutes",
  "cpi",
  "core_cpi",
  "pce",
  "core_pce",
  "nonfarm_payrolls",
  "unemployment_rate",
  "average_hourly_earnings",
] as const;

export function getCanonicalEvent(id: string): CanonicalEventDefinition | undefined {
  return CANONICAL_EVENT_REGISTRY.find((entry) => entry.id === id);
}

export function getRegistryByFamily(family: EventFamily): CanonicalEventDefinition[] {
  return CANONICAL_EVENT_REGISTRY.filter((entry) => entry.family === family);
}
