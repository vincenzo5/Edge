import type { ScreenQuery } from "@/lib/marketData/schemas/request";
import type { ScreenerMeta, ScreenerResultRow, ScreenerState } from "./types";

export type ScreenSummaryInput = {
  screenName: string;
  query: ScreenQuery;
  rows: ScreenerResultRow[];
  meta: ScreenerMeta | null;
  limit?: number;
};

export type ScreenSummary = {
  screenName: string;
  resultCount: number;
  querySummary: string;
  sectorConcentration: Array<{ sector: string; count: number; pct: number }>;
  industryConcentration: Array<{ industry: string; count: number; pct: number }>;
  topGainers: Array<{ symbol: string; changePercent: number | null }>;
  topLosers: Array<{ symbol: string; changePercent: number | null }>;
  technicalSignals: string[];
  marketCapBuckets: Record<string, number>;
  outliers: Array<{ symbol: string; reason: string }>;
  thesisSummary: string;
};

function querySummary(query: ScreenQuery): string {
  const parts: string[] = [];
  if (query.sector) parts.push(`sector=${String(query.sector)}`);
  if (query.industry) parts.push(`industry=${String(query.industry)}`);
  if (query.marketCap?.min != null) parts.push(`marketCap≥${query.marketCap.min}`);
  if (query.marketCap?.max != null) parts.push(`marketCap≤${query.marketCap.max}`);
  if (query.price?.min != null) parts.push(`price≥${query.price.min}`);
  if (query.price?.max != null) parts.push(`price≤${query.price.max}`);
  if (query.volume?.min != null) parts.push(`volume≥${query.volume.min}`);
  if (query.dollarVolume?.min != null) parts.push(`dollarVolume≥${query.dollarVolume.min}`);
  if (query.dollarVolume?.max != null) parts.push(`dollarVolume≤${query.dollarVolume.max}`);
  if (query.technical) parts.push(`technical=${query.technical.kind}`);
  parts.push(`limit=${query.limit ?? 200}`);
  return parts.join(", ");
}

function concentration(
  rows: ScreenerResultRow[],
  field: "sector" | "industry",
  topN = 3,
): Array<{ sector: string; count: number; pct: number } | { industry: string; count: number; pct: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row[field];
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const total = rows.length || 1;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([label, count]) => ({
      [field]: label,
      count,
      pct: Math.round((count / total) * 1000) / 10,
    })) as Array<{ sector: string; count: number; pct: number }>;
}

function marketCapBucket(marketCap: number | null): string {
  if (marketCap == null || !Number.isFinite(marketCap)) return "unknown";
  if (marketCap >= 10_000_000_000) return "large";
  if (marketCap >= 2_000_000_000) return "mid";
  if (marketCap >= 300_000_000) return "small";
  return "micro";
}

function buildTechnicalSignals(
  rows: ScreenerResultRow[],
  indicatorValues?: Record<string, Record<string, number>>,
): string[] {
  if (!indicatorValues || rows.length === 0) return [];
  const signals: string[] = [];
  const keys = new Set<string>();
  for (const row of rows) {
    const metrics = indicatorValues[row.symbol.trim().toUpperCase()];
    if (!metrics) continue;
    for (const key of Object.keys(metrics)) keys.add(key);
  }
  for (const key of [...keys].sort()) {
    const withValue = rows.filter((row) => {
      const value = indicatorValues[row.symbol.trim().toUpperCase()]?.[key];
      return value != null && Number.isFinite(value);
    });
    if (withValue.length === 0) continue;
    const positives = withValue.filter(
      (row) => (indicatorValues[row.symbol.trim().toUpperCase()]?.[key] ?? 0) > 0,
    ).length;
    signals.push(`${positives}/${withValue.length} rows have ${key} > 0`);
  }
  return signals;
}

function buildOutliers(rows: ScreenerResultRow[]): Array<{ symbol: string; reason: string }> {
  const outliers: Array<{ symbol: string; reason: string }> = [];
  for (const row of rows) {
    if (row.beta != null && row.beta >= 2.5) {
      outliers.push({ symbol: row.symbol, reason: `High beta (${row.beta.toFixed(2)})` });
    } else if (row.volume != null && row.volume < 100_000) {
      outliers.push({ symbol: row.symbol, reason: "Low volume (<100k)" });
    }
  }
  return outliers.slice(0, 5);
}

function buildThesisSummary(summary: Omit<ScreenSummary, "thesisSummary">): string {
  const sectorLead = summary.sectorConcentration[0];
  const gainer = summary.topGainers[0];
  const loser = summary.topLosers[0];
  const parts = [
    `${summary.screenName}: ${summary.resultCount} symbols.`,
    sectorLead && "sector" in sectorLead
      ? `Top sector ${sectorLead.sector} (${sectorLead.pct}%).`
      : null,
    gainer?.changePercent != null
      ? `Leader ${gainer.symbol} (${gainer.changePercent.toFixed(2)}%).`
      : null,
    loser?.changePercent != null
      ? `Laggard ${loser.symbol} (${loser.changePercent.toFixed(2)}%).`
      : null,
    summary.technicalSignals[0] ?? null,
  ].filter(Boolean);
  return parts.join(" ");
}

export function buildScreenSummary(input: ScreenSummaryInput): ScreenSummary {
  const limit = input.limit ?? input.rows.length;
  const rows = input.rows.slice(0, limit);
  const ranked = [...rows].sort(
    (a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity),
  );

  const buckets: Record<string, number> = {
    large: 0,
    mid: 0,
    small: 0,
    micro: 0,
    unknown: 0,
  };
  for (const row of rows) {
    buckets[marketCapBucket(row.marketCap)] += 1;
  }

  const sectorConcentration = concentration(rows, "sector") as ScreenSummary["sectorConcentration"];
  const industryConcentration = concentration(rows, "industry") as ScreenSummary["industryConcentration"];
  const technicalSignals = buildTechnicalSignals(rows, input.meta?.indicatorValues);
  const topGainers = ranked.slice(0, 3).map((row) => ({
    symbol: row.symbol,
    changePercent: row.changePercent,
  }));
  const topLosers = [...ranked]
    .reverse()
    .slice(0, 3)
    .map((row) => ({
      symbol: row.symbol,
      changePercent: row.changePercent,
    }));
  const outliers = buildOutliers(rows);

  const base = {
    screenName: input.screenName,
    resultCount: rows.length,
    querySummary: querySummary(input.query),
    sectorConcentration,
    industryConcentration,
    topGainers,
    topLosers,
    technicalSignals,
    marketCapBuckets: buckets,
    outliers,
  };

  return {
    ...base,
    thesisSummary: buildThesisSummary(base),
  };
}

export function resolveScreenName(state: ScreenerState, screenId?: string): string {
  const id = screenId ?? state.activeScreenId;
  if (!id) return "Untitled screen";
  const saved = state.savedScreens.find((screen) => screen.id === id);
  return saved?.name ?? "Untitled screen";
}
