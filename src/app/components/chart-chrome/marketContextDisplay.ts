import type {
  MarketContext,
  MarketContextRelationship,
  MarketContextTradable,
  TradableFlavor,
  TradableGroup,
} from '@/lib/marketData/contracts/marketContext';

export type ContextDensity = 'full' | 'compact' | 'minimal';

export type ContextChip = {
  id: string;
  symbol: string;
  tooltipName: string;
  testId: string;
};

export type ContextDisplayModel = {
  classification: string | null;
  chips: ContextChip[];
  overflow: ContextChip[];
};

type NavigableCrumb = {
  kind: 'navigable';
  id: string;
  label: string;
  symbol: string;
  tooltipName: string;
  testId: string;
};

type LabelCrumb = {
  kind: 'label';
  id: string;
  label: string;
  testId: string;
};

type CrumbItem = NavigableCrumb | LabelCrumb;

function classificationCrumbs(context: MarketContext): MarketContextRelationship[] {
  const fromRelationships = context.relationships.filter(
    (rel) =>
      (rel.kind === 'sector' || rel.kind === 'industry') && rel.label.trim().length > 0,
  );
  if (fromRelationships.length > 0) return fromRelationships;

  const fallback: MarketContextRelationship[] = [];
  if (context.sector?.label) {
    fallback.push({
      kind: 'sector',
      label: context.sector.label,
      source: context.sector.source,
      confidence: context.sector.confidence,
    });
  }
  if (context.industry?.label) {
    fallback.push({
      kind: 'industry',
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

export function buildCrumbItems(context: MarketContext): CrumbItem[] {
  const groups = context.tradableGroups ?? [];
  const classifications = classificationCrumbs(context);
  const sectorRel = classifications.find((rel) => rel.kind === 'sector');
  const industryRel = classifications.find((rel) => rel.kind === 'industry');
  const sectorEtf = firstTradableByFlavor(groups, 'sector_etf');
  const industryEtf = firstTradableByFlavor(groups, 'industry_etf');

  const items: CrumbItem[] = [];
  const usedSymbols = new Set<string>();

  if (sectorRel) {
    if (sectorEtf) {
      const sym = sectorEtf.symbol.trim().toUpperCase();
      usedSymbols.add(sym);
      items.push({
        kind: 'navigable',
        id: `sector-${sym}`,
        label: sectorRel.label,
        symbol: sectorEtf.symbol,
        tooltipName: sectorEtf.label,
        testId: `market-context-crumb-sector-${sym}`,
      });
    } else {
      items.push({
        kind: 'label',
        id: `sector-${sectorRel.label}`,
        label: sectorRel.label,
        testId: 'market-context-crumb-sector',
      });
    }
  }

  if (industryRel) {
    const industryTarget = industryEtf ?? sectorEtf;
    if (industryTarget) {
      const sym = industryTarget.symbol.trim().toUpperCase();
      if (!usedSymbols.has(sym)) {
        usedSymbols.add(sym);
        items.push({
          kind: 'navigable',
          id: `industry-${sym}`,
          label: industryRel.label,
          symbol: industryTarget.symbol,
          tooltipName: industryTarget.label,
          testId: `market-context-crumb-industry-${sym}`,
        });
      }
    } else {
      items.push({
        kind: 'label',
        id: `industry-${industryRel.label}`,
        label: industryRel.label,
        testId: 'market-context-crumb-industry',
      });
    }
  }

  for (const member of allTradableMembers(groups)) {
    const sym = member.symbol.trim().toUpperCase();
    if (usedSymbols.has(sym)) continue;
    usedSymbols.add(sym);
    items.push({
      kind: 'navigable',
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
        kind: 'navigable',
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

function buildClassification(context: MarketContext): string | null {
  const classifications = classificationCrumbs(context);
  const labels: string[] = [];

  for (const rel of classifications) {
    const trimmed = rel.label.trim();
    if (!trimmed) continue;
    if (labels.length > 0 && labels[labels.length - 1] === trimmed) continue;
    labels.push(trimmed);
  }

  if (labels.length === 0) return null;
  return labels.join(' · ');
}

function navigableChipsFromItems(items: CrumbItem[]): ContextChip[] {
  const chips: ContextChip[] = [];
  const seenSymbols = new Set<string>();

  for (const item of items) {
    if (item.kind !== 'navigable') continue;
    const sym = item.symbol.trim().toUpperCase();
    if (seenSymbols.has(sym)) continue;
    seenSymbols.add(sym);
    chips.push({
      id: item.id,
      symbol: sym,
      tooltipName: item.tooltipName,
      testId: item.testId,
    });
  }

  return chips;
}

const CHIP_CAP: Record<ContextDensity, number> = {
  full: 3,
  compact: 1,
  minimal: 0,
};

export function buildContextDisplayModel(
  context: MarketContext,
  density: ContextDensity,
): ContextDisplayModel {
  if (density === 'minimal') {
    return { classification: null, chips: [], overflow: [] };
  }

  const items = buildCrumbItems(context);
  const classification = buildClassification(context);
  const allChips = navigableChipsFromItems(items);
  const cap = CHIP_CAP[density];
  const chips = allChips.slice(0, cap);
  const overflow = allChips.slice(cap);

  if (density === 'compact') {
    return {
      classification: classification?.split(' · ')[0] ?? classification,
      chips,
      overflow,
    };
  }

  return { classification, chips, overflow };
}

export function chipTooltipTitle(chip: ContextChip): string {
  return `Opens related ETF ${chip.symbol} — ${chip.tooltipName}`;
}
