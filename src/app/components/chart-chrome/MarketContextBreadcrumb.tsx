"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  MarketContext,
  MarketContextRelationship,
  MarketContextTradable,
  TradableFlavor,
  TradableGroup,
} from "@/lib/marketData/contracts/marketContext";
import type { Theme } from "@/lib/chartConfig";
import type { SymbolSelectResult } from "@/lib/watchlist/types";
import Tooltip from "../Tooltip";

type Props = {
  symbol: string;
  theme: Theme;
  density: "full" | "compact" | "minimal";
  onSymbolSelect: (result: SymbolSelectResult) => void;
};

type NavigableCrumb = {
  kind: "navigable";
  id: string;
  label: string;
  symbol: string;
  tooltipName: string;
  testId: string;
};

type LabelCrumb = {
  kind: "label";
  id: string;
  label: string;
  testId: string;
};

type CrumbItem = NavigableCrumb | LabelCrumb;

function classificationCrumbs(context: MarketContext): MarketContextRelationship[] {
  const fromRelationships = context.relationships.filter(
    (rel) =>
      (rel.kind === "sector" || rel.kind === "industry") && rel.label.trim().length > 0,
  );
  if (fromRelationships.length > 0) return fromRelationships;

  const fallback: MarketContextRelationship[] = [];
  if (context.sector?.label) {
    fallback.push({
      kind: "sector",
      label: context.sector.label,
      source: context.sector.source,
      confidence: context.sector.confidence,
    });
  }
  if (context.industry?.label) {
    fallback.push({
      kind: "industry",
      label: context.industry.label,
      source: context.industry.source,
      confidence: context.industry.confidence,
    });
  }
  return fallback;
}

function firstTradableByFlavor(
  groups: TradableGroup[],
  flavor: TradableFlavor,
): MarketContextTradable | null {
  const group = groups.find((g) => g.flavor === flavor);
  return group?.members[0] ?? null;
}

function allTradableMembers(groups: TradableGroup[]): MarketContextTradable[] {
  const members: MarketContextTradable[] = [];
  for (const group of groups) {
    members.push(...group.members);
  }
  return members;
}

function legacyNavigableRows(context: MarketContext): MarketContextRelationship[] {
  const flat: MarketContextRelationship[] = [];
  for (const rel of context.relationships) {
    if (rel.members && rel.members.length > 0) {
      flat.push(...rel.members);
    } else if (rel.symbol) {
      flat.push(rel);
    }
  }
  return flat;
}

function buildCrumbItems(context: MarketContext): CrumbItem[] {
  const groups = context.tradableGroups ?? [];
  const classifications = classificationCrumbs(context);
  const sectorRel = classifications.find((rel) => rel.kind === "sector");
  const industryRel = classifications.find((rel) => rel.kind === "industry");
  const sectorEtf = firstTradableByFlavor(groups, "sector_etf");
  const industryEtf = firstTradableByFlavor(groups, "industry_etf");

  const items: CrumbItem[] = [];
  const usedSymbols = new Set<string>();

  if (sectorRel) {
    if (sectorEtf) {
      const sym = sectorEtf.symbol.trim().toUpperCase();
      usedSymbols.add(sym);
      items.push({
        kind: "navigable",
        id: `sector-${sym}`,
        label: sectorRel.label,
        symbol: sectorEtf.symbol,
        tooltipName: sectorEtf.label,
        testId: `market-context-crumb-sector-${sym}`,
      });
    } else {
      items.push({
        kind: "label",
        id: `sector-${sectorRel.label}`,
        label: sectorRel.label,
        testId: "market-context-crumb-sector",
      });
    }
  }

  if (industryRel) {
    const industryTarget = industryEtf ?? sectorEtf;
    if (industryTarget) {
      const sym = industryTarget.symbol.trim().toUpperCase();
      usedSymbols.add(sym);
      items.push({
        kind: "navigable",
        id: `industry-${sym}`,
        label: industryRel.label,
        symbol: industryTarget.symbol,
        tooltipName: industryTarget.label,
        testId: `market-context-crumb-industry-${sym}`,
      });
    } else {
      items.push({
        kind: "label",
        id: `industry-${industryRel.label}`,
        label: industryRel.label,
        testId: "market-context-crumb-industry",
      });
    }
  }

  for (const member of allTradableMembers(groups)) {
    const sym = member.symbol.trim().toUpperCase();
    if (usedSymbols.has(sym)) continue;
    usedSymbols.add(sym);
    items.push({
      kind: "navigable",
      id: `${member.flavor}-${sym}`,
      label: member.label,
      symbol: member.symbol,
      tooltipName: member.label,
      testId: `market-context-crumb-${member.flavor}-${sym}`,
    });
  }

  if (items.length === 0 && groups.length === 0) {
    for (const rel of legacyNavigableRows(context)) {
      if (!rel.symbol) continue;
      const sym = rel.symbol.trim().toUpperCase();
      if (usedSymbols.has(sym)) continue;
      usedSymbols.add(sym);
      items.push({
        kind: "navigable",
        id: `${rel.kind}-${sym}`,
        label: rel.label,
        symbol: rel.symbol,
        tooltipName: rel.label,
        testId: `market-context-crumb-${rel.kind}-${sym}`,
      });
    }
  }

  return items;
}

function visibleCrumbItems(items: CrumbItem[], density: Props["density"]): CrumbItem[] {
  if (density === "minimal") return [];
  if (density === "compact") {
    return items.filter(
      (item) =>
        item.testId.startsWith("market-context-crumb-sector") ||
        item.id.startsWith("sector-"),
    );
  }
  return items;
}

function CrumbSeparator() {
  return (
    <span className="px-0.5 text-[10px] text-[var(--edge-text-muted)]" aria-hidden>
      ›
    </span>
  );
}

function navigableCrumbTitle(item: NavigableCrumb): string {
  return `Opens related ETF ${item.symbol.trim().toUpperCase()} — ${item.tooltipName}`;
}

const navigableCrumbClass =
  "edge-focus-ring cursor-pointer max-w-[160px] truncate rounded px-1 py-0.5 text-[10px] font-medium text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-strong)]";

const labelCrumbClass =
  "max-w-[160px] truncate rounded px-1 py-0.5 text-[10px] font-medium text-[var(--edge-text-muted)]";

export default function MarketContextBreadcrumb({
  symbol,
  theme,
  density,
  onSymbolSelect,
}: Props) {
  void theme;

  const [context, setContext] = useState<MarketContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sym = symbol.trim().toUpperCase();
    if (!sym) {
      setContext(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/market-data/context?symbol=${encodeURIComponent(sym)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Market context request failed (${res.status})`);
        }
        return res.json() as Promise<{ context: MarketContext }>;
      })
      .then((body) => {
        if (!cancelled) {
          setContext(body.context);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setContext(null);
          setError(err instanceof Error ? err.message : "Failed to load market context");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const crumbItems = useMemo(
    () => (context ? visibleCrumbItems(buildCrumbItems(context), density) : []),
    [context, density],
  );

  const navigateToSymbol = (args: { symbol: string; name: string }) => {
    onSymbolSelect({
      symbol: args.symbol,
      name: args.name,
      exchange: context?.exchange ?? "",
    });
  };

  if (!symbol.trim()) return null;

  return (
    <div
      className="flex min-w-0 flex-wrap items-center gap-1"
      data-testid="market-context-breadcrumb"
    >
      {loading ? (
        <span
          data-testid="market-context-loading"
          className="rounded-[var(--edge-radius-sm)] bg-[var(--edge-surface-panel)] px-2 py-0.5 text-[10px] text-[var(--edge-text-muted)]"
        >
          Context…
        </span>
      ) : null}

      {!loading && crumbItems.length > 0 ? (
        <div className="flex min-w-0 flex-wrap items-center gap-0.5">
          {crumbItems.map((item, index) => (
            <div key={item.id} className="flex min-w-0 items-center">
              {index > 0 ? <CrumbSeparator /> : null}
              {item.kind === "navigable" ? (
                <Tooltip content={navigableCrumbTitle(item)} theme={theme} portaled>
                  <button
                    type="button"
                    data-testid={item.testId}
                    onClick={() =>
                      navigateToSymbol({ symbol: item.symbol, name: item.tooltipName })
                    }
                    className={navigableCrumbClass}
                  >
                    {item.label}
                  </button>
                </Tooltip>
              ) : (
                <span data-testid={item.testId} className={labelCrumbClass}>
                  {item.label}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {!loading && error && crumbItems.length === 0 ? (
        <span
          data-testid="market-context-error"
          className="text-[10px] text-[var(--edge-negative)]"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
