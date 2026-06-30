import type {
  MarketContextClassification,
  MarketContextRelationship,
  MarketContextSource,
  MarketContextTradable,
  TradableFlavor,
  TradableGroup,
} from "../contracts/marketContext";

const CURATED: MarketContextSource = "curated";

/** GICS-style sector labels → representative sector ETF. */
const SECTOR_ETF_MAP: Record<string, string> = {
  technology: "XLK",
  "information technology": "XLK",
  "financial services": "XLF",
  financials: "XLF",
  "health care": "XLV",
  healthcare: "XLV",
  "consumer discretionary": "XLY",
  "consumer staples": "XLP",
  energy: "XLE",
  industrials: "XLI",
  materials: "XLB",
  utilities: "XLU",
  "real estate": "XLRE",
  "communication services": "XLC",
  communications: "XLC",
  // Provider classifications occasionally surface an industry as the sector;
  // map the common ones so the Related popover still resolves a sector ETF.
  semiconductors: "SMH",
  software: "IGV",
  biotechnology: "XBI",
};

/** High-confidence industry labels → representative industry ETF. */
const INDUSTRY_ETF_MAP: Record<string, { symbol: string; label: string }> = {
  semiconductors: { symbol: "SMH", label: "Semiconductors ETF" },
  "semiconductor equipment & materials": { symbol: "SMH", label: "Semiconductors ETF" },
  software: { symbol: "IGV", label: "Software ETF" },
  "software—infrastructure": { symbol: "IGV", label: "Software ETF" },
  "software—application": { symbol: "IGV", label: "Software ETF" },
  banks: { symbol: "KBE", label: "Banks ETF" },
  "banks—regional": { symbol: "KBE", label: "Banks ETF" },
  "banks—diversified": { symbol: "KBE", label: "Banks ETF" },
  biotechnology: { symbol: "XBI", label: "Biotech ETF" },
  "drug manufacturers—general": { symbol: "XBI", label: "Biotech ETF" },
};

/** Curated broad-market index membership — do not infer from exchange listing. */
const INDEX_MEMBERSHIP: Record<string, Array<{ indexLabel: string; etfSymbol: string }>> = {
  AAPL: [{ indexLabel: "S&P 500", etfSymbol: "SPY" }],
  MSFT: [{ indexLabel: "S&P 500", etfSymbol: "SPY" }],
  NVDA: [{ indexLabel: "S&P 500", etfSymbol: "SPY" }],
  AMZN: [{ indexLabel: "S&P 500", etfSymbol: "SPY" }],
  GOOGL: [{ indexLabel: "S&P 500", etfSymbol: "SPY" }],
  GOOG: [{ indexLabel: "S&P 500", etfSymbol: "SPY" }],
  META: [{ indexLabel: "S&P 500", etfSymbol: "SPY" }],
  TSLA: [{ indexLabel: "S&P 500", etfSymbol: "SPY" }],
  KO: [{ indexLabel: "S&P 500", etfSymbol: "SPY" }],
  JPM: [{ indexLabel: "S&P 500", etfSymbol: "SPY" }],
  UNH: [{ indexLabel: "S&P 500", etfSymbol: "SPY" }],
  IBM: [{ indexLabel: "S&P 500", etfSymbol: "SPY" }],
};

/** Curated benchmark index membership (Dow, Nasdaq-100, etc.). */
const BENCHMARK_MEMBERSHIP: Record<string, Array<{ indexLabel: string; etfSymbol: string }>> = {
  AAPL: [
    { indexLabel: "Nasdaq-100", etfSymbol: "QQQ" },
    { indexLabel: "Dow Jones", etfSymbol: "DIA" },
  ],
  MSFT: [
    { indexLabel: "Nasdaq-100", etfSymbol: "QQQ" },
    { indexLabel: "Dow Jones", etfSymbol: "DIA" },
  ],
  NVDA: [{ indexLabel: "Nasdaq-100", etfSymbol: "QQQ" }],
  AMZN: [{ indexLabel: "Nasdaq-100", etfSymbol: "QQQ" }],
  GOOGL: [{ indexLabel: "Nasdaq-100", etfSymbol: "QQQ" }],
  GOOG: [{ indexLabel: "Nasdaq-100", etfSymbol: "QQQ" }],
  META: [{ indexLabel: "Nasdaq-100", etfSymbol: "QQQ" }],
  TSLA: [{ indexLabel: "Nasdaq-100", etfSymbol: "QQQ" }],
  KO: [{ indexLabel: "Dow Jones", etfSymbol: "DIA" }],
  JPM: [{ indexLabel: "Dow Jones", etfSymbol: "DIA" }],
  UNH: [{ indexLabel: "Dow Jones", etfSymbol: "DIA" }],
  IBM: [{ indexLabel: "Dow Jones", etfSymbol: "DIA" }],
};

/** Curated style-factor index membership. */
const STYLE_MEMBERSHIP: Record<string, Array<{ indexLabel: string; etfSymbol: string }>> = {
  IBM: [{ indexLabel: "S&P 500 Value", etfSymbol: "SPYV" }],
  JPM: [{ indexLabel: "S&P 500 Value", etfSymbol: "SPYV" }],
  KO: [{ indexLabel: "S&P 500 Value", etfSymbol: "SPYV" }],
  UNH: [{ indexLabel: "S&P 500 Value", etfSymbol: "SPYV" }],
  AAPL: [{ indexLabel: "S&P 500 Growth", etfSymbol: "SPYG" }],
  MSFT: [{ indexLabel: "S&P 500 Growth", etfSymbol: "SPYG" }],
  NVDA: [{ indexLabel: "S&P 500 Growth", etfSymbol: "SPYG" }],
  AMZN: [{ indexLabel: "S&P 500 Growth", etfSymbol: "SPYG" }],
  GOOGL: [{ indexLabel: "S&P 500 Growth", etfSymbol: "SPYG" }],
  GOOG: [{ indexLabel: "S&P 500 Growth", etfSymbol: "SPYG" }],
  META: [{ indexLabel: "S&P 500 Growth", etfSymbol: "SPYG" }],
  TSLA: [{ indexLabel: "S&P 500 Growth", etfSymbol: "SPYG" }],
};

/** Curated strategy / thematic index membership. */
const STRATEGY_MEMBERSHIP: Record<string, Array<{ indexLabel: string; etfSymbol: string }>> = {
  IBM: [{ indexLabel: "Dividend Aristocrats", etfSymbol: "NOBL" }],
  KO: [{ indexLabel: "Dividend Aristocrats", etfSymbol: "NOBL" }],
  JPM: [{ indexLabel: "Dividend Aristocrats", etfSymbol: "NOBL" }],
  UNH: [{ indexLabel: "Dividend Aristocrats", etfSymbol: "NOBL" }],
};

const TRADABLE_GROUP_LABELS: Record<TradableFlavor, string> = {
  sector_etf: "Sector ETF",
  industry_etf: "Industry ETF",
  broad_market: "Broad market",
  benchmark: "Benchmark",
  sector_index: "Sector index",
  style: "Style",
  strategy: "Strategy",
};

const TRADABLE_FLAVOR_ORDER: TradableFlavor[] = [
  "sector_etf",
  "industry_etf",
  "broad_market",
  "benchmark",
  "sector_index",
  "style",
  "strategy",
];

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function dedupeTradablesBySymbol(members: MarketContextTradable[]): MarketContextTradable[] {
  const seen = new Set<string>();
  const deduped: MarketContextTradable[] = [];
  for (const member of members) {
    const key = member.symbol.trim().toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(member);
  }
  return deduped;
}

function membershipTradables(
  flavor: TradableFlavor,
  entries: Array<{ indexLabel: string; etfSymbol: string }>,
  reason: string,
): MarketContextTradable[] {
  return entries.map((entry) => ({
    flavor,
    label: entry.indexLabel,
    symbol: entry.etfSymbol,
    indexLabel: entry.indexLabel,
    source: CURATED,
    confidence: "curated",
    reason,
  }));
}

export function mapSectorToEtf(sectorLabel: string | null | undefined): string | null {
  if (!sectorLabel?.trim()) return null;
  return SECTOR_ETF_MAP[normalizeKey(sectorLabel)] ?? null;
}

export function mapIndustryToEtf(
  industryLabel: string | null | undefined,
): { symbol: string; label: string } | null {
  if (!industryLabel?.trim()) return null;
  const key = normalizeKey(industryLabel);
  if (INDUSTRY_ETF_MAP[key]) return INDUSTRY_ETF_MAP[key]!;
  for (const [pattern, entry] of Object.entries(INDUSTRY_ETF_MAP)) {
    if (key.includes(pattern) || pattern.includes(key)) return entry;
  }
  return null;
}

export function buildCuratedRelationships(args: {
  symbol: string;
  sector: MarketContextClassification | null;
  industry: MarketContextClassification | null;
  exchange: string | null;
}): MarketContextRelationship[] {
  const relationships: MarketContextRelationship[] = [];
  const sym = args.symbol.trim().toUpperCase();

  if (args.exchange?.trim()) {
    relationships.push({
      kind: "exchange",
      label: args.exchange.trim(),
      source: CURATED,
      confidence: "provider",
      reason: "Listing exchange from provider metadata",
    });
  }

  if (args.sector?.label) {
    relationships.push({
      kind: "sector",
      label: args.sector.label,
      source: args.sector.source,
      confidence: args.sector.confidence,
    });
    const sectorEtf = mapSectorToEtf(args.sector.label);
    if (sectorEtf) {
      relationships.push({
        kind: "sector_etf",
        label: `${args.sector.label} ETF`,
        symbol: sectorEtf,
        source: CURATED,
        confidence: "curated",
        reason: "Representative sector ETF mapping",
      });
    } else {
      // Fallback: try industry ETF map when sector label is non-GICS.
      const industryEtf = mapIndustryToEtf(args.sector.label);
      if (industryEtf) {
        relationships.push({
          kind: "sector_etf",
          label: industryEtf.label,
          symbol: industryEtf.symbol,
          source: CURATED,
          confidence: "curated",
          reason: "Representative sector ETF mapping (industry-map fallback)",
        });
      }
    }
  }

  if (args.industry?.label) {
    relationships.push({
      kind: "industry",
      label: args.industry.label,
      source: args.industry.source,
      confidence: args.industry.confidence,
    });
    const industryEtf = mapIndustryToEtf(args.industry.label);
    if (industryEtf) {
      relationships.push({
        kind: "industry_etf",
        label: industryEtf.label,
        symbol: industryEtf.symbol,
        source: CURATED,
        confidence: "curated",
        reason: "Representative industry ETF mapping",
      });
    }
  }

  const broadMembership = INDEX_MEMBERSHIP[sym] ?? [];
  for (const membership of broadMembership) {
    relationships.push({
      kind: "index_member",
      label: membership.indexLabel,
      symbol: membership.etfSymbol,
      source: CURATED,
      confidence: "curated",
      reason: "Curated broad-market index membership",
    });
  }

  const benchmarkMembership = BENCHMARK_MEMBERSHIP[sym] ?? [];
  for (const membership of benchmarkMembership) {
    relationships.push({
      kind: "index_member",
      label: membership.indexLabel,
      symbol: membership.etfSymbol,
      source: CURATED,
      confidence: "curated",
      reason: "Curated benchmark index membership",
    });
  }

  return relationships;
}

export function buildTradableGroups(args: {
  symbol: string;
  sector: MarketContextClassification | null;
  industry: MarketContextClassification | null;
}): TradableGroup[] {
  const sym = args.symbol.trim().toUpperCase();
  const byFlavor = new Map<TradableFlavor, MarketContextTradable[]>();

  const pushMember = (flavor: TradableFlavor, member: MarketContextTradable) => {
    const list = byFlavor.get(flavor) ?? [];
    list.push(member);
    byFlavor.set(flavor, list);
  };

  if (args.sector?.label) {
    const sectorEtf = mapSectorToEtf(args.sector.label);
    if (sectorEtf) {
      pushMember("sector_etf", {
        flavor: "sector_etf",
        label: `${args.sector.label} sector`,
        symbol: sectorEtf,
        source: CURATED,
        confidence: "curated",
        reason: "Representative sector ETF mapping",
      });
    } else {
      // Fallback: provider classifications sometimes surface an industry as
      // the sector. Try the industry ETF map so a Related ETF still resolves.
      const industryEtf = mapIndustryToEtf(args.sector.label);
      if (industryEtf) {
        pushMember("sector_etf", {
          flavor: "sector_etf",
          label: industryEtf.label,
          symbol: industryEtf.symbol,
          source: CURATED,
          confidence: "curated",
          reason: "Representative sector ETF mapping (industry-map fallback)",
        });
      }
    }
  }

  if (args.industry?.label) {
    const industryEtf = mapIndustryToEtf(args.industry.label);
    const sectorEtf = args.sector?.label ? mapSectorToEtf(args.sector.label) : null;
    if (industryEtf && industryEtf.symbol !== sectorEtf) {
      pushMember("industry_etf", {
        flavor: "industry_etf",
        label: industryEtf.label,
        symbol: industryEtf.symbol,
        source: CURATED,
        confidence: "curated",
        reason: "Representative industry ETF mapping",
      });
    }
  }

  for (const member of membershipTradables(
    "broad_market",
    INDEX_MEMBERSHIP[sym] ?? [],
    "Curated broad-market index membership",
  )) {
    pushMember("broad_market", member);
  }

  for (const member of membershipTradables(
    "benchmark",
    BENCHMARK_MEMBERSHIP[sym] ?? [],
    "Curated benchmark index membership",
  )) {
    pushMember("benchmark", member);
  }

  for (const member of membershipTradables(
    "style",
    STYLE_MEMBERSHIP[sym] ?? [],
    "Curated style-factor index membership",
  )) {
    pushMember("style", member);
  }

  for (const member of membershipTradables(
    "strategy",
    STRATEGY_MEMBERSHIP[sym] ?? [],
    "Curated strategy index membership",
  )) {
    pushMember("strategy", member);
  }

  const groups: TradableGroup[] = [];
  for (const flavor of TRADABLE_FLAVOR_ORDER) {
    const members = byFlavor.get(flavor);
    if (!members || members.length === 0) continue;
    groups.push({
      flavor,
      label: TRADABLE_GROUP_LABELS[flavor],
      members: dedupeTradablesBySymbol(members),
    });
  }

  return groups;
}

/** Classification-only breadcrumb chain: sector and industry labels (non-navigable). */
export function buildBreadcrumbChain(
  relationships: MarketContextRelationship[],
): MarketContextRelationship[] {
  const chain: MarketContextRelationship[] = [];
  const sectorRel = relationships.find((r) => r.kind === "sector");
  const industryRel = relationships.find((r) => r.kind === "industry");

  if (sectorRel) {
    chain.push({ ...sectorRel, symbol: undefined, members: undefined });
  }

  if (industryRel) {
    chain.push({ ...industryRel, symbol: undefined, members: undefined });
  }

  return chain;
}
