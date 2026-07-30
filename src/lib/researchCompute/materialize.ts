import "server-only";

import type { CandleResponse } from "@/lib/marketData/contracts/equities";
import type { DataResult } from "@/lib/marketData/contracts/result";
import type { MarketDataService } from "@/lib/marketData/service/marketDataService";

import type { CreateDatasetInput, DatasetManifest, ResearchBar } from "./contracts";
import {
  ACQUISITION_POLICY_VERSION,
  COMPUTE_VERSION,
  DEFAULT_RESEARCH_ADJUSTMENT,
  DEFAULT_RESEARCH_TIMEZONE,
  MAX_RESEARCH_SYMBOLS,
  MAX_RESEARCH_TOTAL_BARS,
} from "./constants";
import {
  computeContentFingerprint,
  computeDatasetId,
  computeIdentityFingerprint,
  normalizeDatasetIdentity,
} from "./fingerprints";
import { writeBarsParquet } from "./parquet";
import {
  datasetExists,
  datasetManifestPath,
  ensureResearchRoot,
  symbolPartitionPath,
} from "./paths";
import { readDatasetManifest, writeDatasetManifest } from "./datasetStore";

const PAGE_SIZE = 500;

function normalizeBars(candles: CandleResponse["candles"]): ResearchBar[] {
  return candles.map((candle) => ({
    t: candle.t,
    o: candle.o,
    h: candle.h,
    l: candle.l,
    c: candle.c,
    v: candle.v,
  }));
}

function dedupeBars(bars: ResearchBar[]): ResearchBar[] {
  const byTimestamp = new Map<number, ResearchBar>();
  for (const bar of bars) {
    byTimestamp.set(bar.t, bar);
  }
  return [...byTimestamp.values()].sort((left, right) => left.t - right.t);
}

function filterWindow(bars: ResearchBar[], fromMs: number, toMs: number): ResearchBar[] {
  return bars.filter((bar) => bar.t >= fromMs && bar.t <= toMs);
}

export async function fetchSymbolBars(args: {
  marketData: MarketDataService;
  symbol: string;
  interval: CreateDatasetInput["interval"];
  fromMs: number;
  toMs: number;
}): Promise<{
  bars: ResearchBar[];
  sources: Set<string>;
  warnings: string[];
  paginationPages: number;
}> {
  const warnings: string[] = [];
  const sources = new Set<string>();
  const collected: ResearchBar[] = [];
  let before: number | undefined;
  let paginationPages = 0;

  while (true) {
    paginationPages += 1;
    const result: DataResult<CandleResponse> = await args.marketData.getCandles({
      symbol: args.symbol,
      interval: args.interval,
      ...(before == null
        ? { range: "max" as const }
        : { beforeTimestamp: before, barCount: PAGE_SIZE }),
    });

    sources.add(String(result.source));
    warnings.push(...result.warnings);

    const pageBars = normalizeBars(result.data.candles);
    if (pageBars.length === 0) break;

    collected.unshift(...pageBars);

    const oldest = pageBars[0]!.t;
    if (oldest <= args.fromMs) break;
    if (!result.data.hasMore) break;

    const nextBefore =
      result.data.nextBeforeTimestamp ?? (oldest > 0 ? oldest - 1 : undefined);
    if (nextBefore == null || nextBefore === before) break;
    before = nextBefore;
  }

  return {
    bars: filterWindow(dedupeBars(collected), args.fromMs, args.toMs),
    sources,
    warnings,
    paginationPages,
  };
}

export async function materializeDataset(args: {
  marketData: MarketDataService;
  input: CreateDatasetInput;
  resolvedProvider: string;
}): Promise<{ manifest: DatasetManifest; created: boolean }> {
  const symbols = [...new Set(args.input.symbols.map((symbol) => symbol.trim().toUpperCase()))];
  if (symbols.length === 0) {
    throw new Error("At least one symbol is required");
  }
  if (symbols.length > MAX_RESEARCH_SYMBOLS) {
    throw new Error(`Dataset exceeds symbol cap (${MAX_RESEARCH_SYMBOLS})`);
  }
  if (args.input.fromMs >= args.input.toMs) {
    throw new Error("fromMs must be less than toMs");
  }

  const identity = normalizeDatasetIdentity({
    symbols,
    interval: args.input.interval,
    fromMs: args.input.fromMs,
    toMs: args.input.toMs,
    provider: args.resolvedProvider,
    adjustment: args.input.adjustment ?? DEFAULT_RESEARCH_ADJUSTMENT,
    timezone: args.input.timezone ?? DEFAULT_RESEARCH_TIMEZONE,
  });

  const identityFingerprint = computeIdentityFingerprint(identity);
  const datasetId = computeDatasetId(identityFingerprint);

  if (datasetExists(datasetId)) {
    const existing = readDatasetManifest(datasetId);
    if (existing && existing.identityFingerprint === identityFingerprint) {
      return { manifest: existing, created: false };
    }
  }

  ensureResearchRoot();

  const warnings: string[] = [
    "Provider adjustment/timezone selectors are not exposed by MarketDataService yet; stored defaults may not match upstream normalization.",
  ];
  const sources = new Set<string>();
  const barsBySymbol: Record<string, ResearchBar[]> = {};
  const symbolRowCounts: Record<string, number> = {};
  let totalBars = 0;
  let paginationPages = 0;

  for (const symbol of symbols) {
    const fetched = await fetchSymbolBars({
      marketData: args.marketData,
      symbol,
      interval: identity.interval,
      fromMs: identity.fromMs,
      toMs: identity.toMs,
    });
    barsBySymbol[symbol] = fetched.bars;
    symbolRowCounts[symbol] = fetched.bars.length;
    totalBars += fetched.bars.length;
    paginationPages += fetched.paginationPages;
    fetched.sources.forEach((source) => sources.add(source));
    warnings.push(...fetched.warnings.map((warning) => `${symbol}: ${warning}`));
  }

  if (totalBars === 0) {
    throw new Error("No bars materialized for requested window");
  }
  if (totalBars > MAX_RESEARCH_TOTAL_BARS) {
    throw new Error(`Dataset exceeds total bar cap (${MAX_RESEARCH_TOTAL_BARS})`);
  }

  for (const symbol of symbols) {
    await writeBarsParquet(symbolPartitionPath(datasetId, symbol), barsBySymbol[symbol]!);
  }

  const manifest: DatasetManifest = {
    datasetId,
    identity,
    identityFingerprint,
    contentFingerprint: computeContentFingerprint(barsBySymbol),
    acquisitionMeta: {
      providerRoute: identity.provider,
      sources: [...sources],
      warnings,
      rowCount: totalBars,
      paginationPages,
    },
    materializedAt: new Date().toISOString(),
    computeVersion: COMPUTE_VERSION,
    acquisitionPolicyVersion: ACQUISITION_POLICY_VERSION,
    symbolRowCounts,
  };

  writeDatasetManifest(datasetId, manifest);
  return { manifest, created: true };
}

export function datasetSummaryFromManifest(manifest: DatasetManifest) {
  return {
    datasetId: manifest.datasetId,
    identity: manifest.identity,
    identityFingerprint: manifest.identityFingerprint,
    contentFingerprint: manifest.contentFingerprint,
    materializedAt: manifest.materializedAt,
    rowCount: manifest.acquisitionMeta.rowCount,
    symbolRowCounts: manifest.symbolRowCounts,
    provenance: {
      providerRoute: manifest.acquisitionMeta.providerRoute,
      sources: manifest.acquisitionMeta.sources,
      warnings: manifest.acquisitionMeta.warnings,
    },
  };
}

export { datasetManifestPath };
