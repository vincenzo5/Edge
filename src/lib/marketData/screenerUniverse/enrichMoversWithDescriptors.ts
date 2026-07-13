import type { FmpMarketMover, FmpScreenerRow } from "../contracts/fmp";

export function buildDescriptorMap(rows: FmpScreenerRow[]): Map<string, FmpScreenerRow> {
  const map = new Map<string, FmpScreenerRow>();
  for (const row of rows) {
    const key = row.symbol.trim().toUpperCase();
    if (key) map.set(key, row);
  }
  return map;
}

export function enrichMoversWithDescriptors(
  movers: FmpMarketMover[],
  descriptorMap: Map<string, FmpScreenerRow>,
): FmpMarketMover[] {
  return movers.map((mover) => {
    const descriptor = descriptorMap.get(mover.symbol.trim().toUpperCase());
    if (!descriptor) return mover;
    return {
      ...mover,
      name: mover.name ?? descriptor.name,
      price: mover.price ?? descriptor.price,
      change: mover.change ?? descriptor.change,
      changePercent: mover.changePercent ?? descriptor.changePercent,
      exchange: mover.exchange ?? descriptor.exchange,
      volume: mover.volume ?? descriptor.volume,
      sector: descriptor.sector,
      industry: descriptor.industry,
      country: descriptor.country,
      beta: descriptor.beta,
      marketCap: descriptor.marketCap,
      dividendYield: descriptor.dividendYield,
    };
  });
}
