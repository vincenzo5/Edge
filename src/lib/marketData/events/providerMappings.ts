import type { CanonicalEventDefinition, CanonicalEventId } from "./registry";
import { CANONICAL_EVENT_REGISTRY } from "./registry";

/** Map SEC form type to canonical filing event id. */
export function secFormToCanonicalId(formType: string): CanonicalEventId {
  const normalized = formType.trim().toUpperCase();
  for (const entry of CANONICAL_EVENT_REGISTRY) {
    if (!entry.secFormTypes) continue;
    if (entry.secFormTypes.some((form) => form.toUpperCase() === normalized)) {
      return entry.id;
    }
  }
  return "sec_filing";
}

/** FMP economic-calendar event name patterns (order matters — specific before general). */
const FMP_MACRO_EVENT_PATTERNS: ReadonlyArray<{
  id: CanonicalEventId;
  patterns: readonly string[];
}> = [
  { id: "fomc_minutes", patterns: ["fomc minutes"] },
  {
    id: "fomc_rate_decision",
    patterns: [
      "fomc statement",
      "fomc press conference",
      "federal funds rate",
      "fed interest rate",
      "interest rate decision",
      "fomc",
    ],
  },
  { id: "core_cpi", patterns: ["core cpi", "core consumer price"] },
  { id: "cpi", patterns: ["consumer price index", "cpi yoy", "cpi mom", " cpi"] },
  { id: "core_pce", patterns: ["core pce"] },
  {
    id: "pce",
    patterns: ["personal consumption expenditures", "pce price index", " pce"],
  },
  {
    id: "nonfarm_payrolls",
    patterns: ["nonfarm payroll", "non-farm payroll", "non farm payroll", "nfp"],
  },
  { id: "unemployment_rate", patterns: ["unemployment rate"] },
  { id: "average_hourly_earnings", patterns: ["average hourly earnings"] },
  { id: "gdp", patterns: ["gross domestic product", " gdp"] },
  { id: "ism_manufacturing", patterns: ["ism manufacturing", "manufacturing pmi"] },
  { id: "ism_services", patterns: ["ism services", "services pmi", "non-manufacturing"] },
  { id: "retail_sales", patterns: ["retail sales"] },
];

/** Map FMP economic-calendar event name to canonical macro id, if recognized. */
export function fmpEventToCanonicalId(eventName: string): CanonicalEventId | null {
  const lower = eventName.trim().toLowerCase();
  for (const entry of FMP_MACRO_EVENT_PATTERNS) {
    if (entry.patterns.some((pattern) => lower.includes(pattern))) {
      return entry.id;
    }
  }
  return null;
}

/** Map FRED release name to canonical macro event id, if recognized. */
export function fredReleaseToCanonicalId(releaseName: string): CanonicalEventId | null {
  const lower = releaseName.trim().toLowerCase();
  for (const entry of CANONICAL_EVENT_REGISTRY) {
    if (entry.family !== "macro" || !entry.fredReleasePatterns) continue;
    if (entry.fredReleasePatterns.some((pattern) => lower.includes(pattern))) {
      return entry.id;
    }
  }
  return null;
}

/** Map legacy corporate event type to canonical id. */
export function corporateTypeToCanonicalId(
  type: string,
): CanonicalEventId | null {
  switch (type) {
    case "earnings":
      return "earnings";
    case "dividend":
      return "dividend";
    case "split":
      return "split";
    case "filing":
      return "sec_filing";
    case "economic":
      return null;
    default:
      return null;
  }
}

export function getDefinitionForCanonicalId(
  id: CanonicalEventId,
): CanonicalEventDefinition | undefined {
  return CANONICAL_EVENT_REGISTRY.find((entry) => entry.id === id);
}

/** Providers required for priority-1 macro coverage. */
export function priorityOneMacroProviderCoverage(): Record<
  CanonicalEventId,
  { hasLiveProvider: boolean; providers: string[] }
> {
  const result = {} as Record<
    CanonicalEventId,
    { hasLiveProvider: boolean; providers: string[] }
  >;
  for (const entry of CANONICAL_EVENT_REGISTRY) {
    if (entry.family !== "macro") continue;
    const providers = entry.providerPaths.map((p) => p.provider);
    const hasLiveProvider = providers.some(
      (p) => p === "fred" || p === "fmp" || p === "economic_calendar",
    );
    result[entry.id] = { hasLiveProvider, providers };
  }
  return result;
}
