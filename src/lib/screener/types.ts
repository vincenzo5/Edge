import type { FmpScreenerRow } from "@/lib/marketData/contracts/fmp";
import type { ScreenQuery, TechnicalRule } from "@/lib/marketData/schemas/request";

export type ScreenerResultRow = FmpScreenerRow;

export type ScreenerColumnId =
  | "symbol"
  | "name"
  | "price"
  | "change"
  | "changePercent"
  | "volume"
  | "sector"
  | "industry"
  | "country"
  | "marketCap"
  | "dividendYield"
  | "beta";

export const ALL_SCREENER_COLUMN_IDS: readonly ScreenerColumnId[] = [
  "symbol",
  "name",
  "price",
  "change",
  "changePercent",
  "volume",
  "sector",
  "industry",
  "country",
  "marketCap",
  "dividendYield",
  "beta",
] as const;

export function isScreenerColumnId(value: string): value is ScreenerColumnId {
  return (ALL_SCREENER_COLUMN_IDS as readonly string[]).includes(value);
}

export const SCREENER_COLUMN_LABELS: Record<ScreenerColumnId, string> = {
  symbol: "Symbol",
  name: "Name",
  price: "Price",
  change: "Chg",
  changePercent: "Chg %",
  volume: "Volume",
  sector: "Sector",
  industry: "Industry",
  country: "Country",
  marketCap: "Mkt Cap",
  dividendYield: "Div Yield",
  beta: "Beta",
};

export const DEFAULT_SCREENER_COLUMNS: ScreenerColumnId[] = [
  "symbol",
  "name",
  "price",
  "changePercent",
  "volume",
  "sector",
  "marketCap",
  "beta",
];

export type SavedScreen = {
  id: string;
  name: string;
  query: ScreenQuery;
  columns: ScreenerColumnId[];
  sort?: PersistedScreenerSortSpec | null;
  createdAt: number;
  updatedAt: number;
};

export type ScreenerState = {
  version: 1;
  activeScreenId: string | null;
  query: ScreenQuery;
  columns: ScreenerColumnId[];
  sort?: PersistedScreenerSortSpec | null;
  savedScreens: SavedScreen[];
};

export type ScreenerIndicatorColumnDef = {
  key: string;
  label: string;
};

export type PersistedScreenerSortSpec = {
  column: ScreenerColumnId;
  direction: "asc" | "desc";
};

export type ScreenerSortSpec = {
  /** Base table column id or ephemeral indicator metric key from meta.indicatorValues. */
  column: ScreenerColumnId | string;
  direction: "asc" | "desc";
};

export type ScreenerPhaseInfo = {
  step1Count?: number;
  step2Count?: number;
  matchedCount?: number;
};

export function parseScreenerPhases(raw: unknown): ScreenerPhaseInfo | undefined {
  if (!Array.isArray(raw)) return undefined;
  const info: ScreenerPhaseInfo = {};
  for (const phase of raw) {
    if (!phase || typeof phase !== "object") continue;
    const record = phase as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name : "";
    const detail =
      record.detail && typeof record.detail === "object"
        ? (record.detail as Record<string, unknown>)
        : {};
    if (name === "screener.prefilter") {
      if (typeof detail.count === "number") info.step1Count = detail.count;
      if (typeof detail.candidates === "number") info.step1Count = detail.candidates;
    }
    if (name === "screener.technical" || name === "screener.technical.aggregate") {
      if (typeof detail.candidates === "number") info.step2Count = detail.candidates;
      if (typeof detail.matched === "number") info.matchedCount = detail.matched;
    }
  }
  return info.step1Count != null || info.step2Count != null || info.matchedCount != null
    ? info
    : undefined;
}

export function formatScreenerPhaseSummary(phases?: ScreenerPhaseInfo): string | null {
  if (!phases) return null;
  if (phases.step2Count == null && phases.step1Count == null) return null;
  const step1 = phases.step1Count ?? "?";
  const evaluated = phases.step2Count ?? "?";
  const matched = phases.matchedCount ?? 0;
  return `Step 1: ${step1} prefiltered → Step 2: ${matched} matched (${evaluated} evaluated)`;
}

export function screenerLoadingLabel(hasTechnical: boolean): string {
  return hasTechnical
    ? "Step 1: FMP prefilter → Step 2: Computing technicals…"
    : "Running screen…";
}

export function isTechnicalScreenQuery(query: ScreenQuery): boolean {
  return query.technical != null;
}

export type ScreenerLastRun = {
  rows: ScreenerResultRow[];
  meta: ScreenerMeta | null;
};

export type ScreenerMeta = {
  source: string;
  warnings: string[];
  skippedSymbols: string[];
  stale: boolean;
  asOf?: number;
  latencyMs?: number;
  phases?: ScreenerPhaseInfo;
  indicatorValues?: Record<string, Record<string, number>>;
};

export type { ScreenQuery, TechnicalRule };
