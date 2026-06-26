import type { IndicatorPlugin } from '../plugin-api';
import {
  INDICATOR_CATALOG,
  INDICATOR_CATEGORIES,
  type IndicatorMeta,
  isMainPane,
  getCatalogMeta,
} from './catalog';
import { ma } from './ma';
import { emaPlugin } from './ema';
import { boll } from './boll';
import { macd } from './macd';
import { rsi } from './rsi';
import { vol } from './vol';
import { vwap } from './vwap';
import { atr } from './atr';
import { kdj } from './kdj';
import { cci } from './cci';
import { obv } from './obv';
import { dmi } from './dmi';
import { wr } from './wr';
import { roc } from './roc';
import { supertrend } from './supertrend';

const registry = new Map<string, IndicatorPlugin>();

export function registerIndicator(plugin: IndicatorPlugin) {
  registry.set(plugin.name, plugin);
}

export function getIndicator(name: string): IndicatorPlugin | undefined {
  return registry.get(name);
}

export function getAllIndicators(): IndicatorPlugin[] {
  return Array.from(registry.values());
}

export function isIndicatorImplemented(plugin: IndicatorPlugin | undefined): boolean {
  return plugin != null && typeof plugin.compute === 'function';
}

export type CatalogEntry = IndicatorMeta & {
  implemented: boolean;
  plugin?: IndicatorPlugin;
};

export function getCatalogEntry(name: string): CatalogEntry | undefined {
  const meta = getCatalogMeta(name);
  if (!meta) return undefined;
  const plugin = registry.get(name);
  return {
    ...meta,
    implemented: isIndicatorImplemented(plugin),
    plugin,
  };
}

export function getCatalog(): CatalogEntry[] {
  return INDICATOR_CATALOG.map((meta) => {
    const plugin = registry.get(meta.name);
    return {
      ...meta,
      implemented: isIndicatorImplemented(plugin),
      plugin,
    };
  });
}

export function getCatalogByCategory(): Record<
  (typeof INDICATOR_CATEGORIES)[number],
  CatalogEntry[]
> {
  const out = Object.fromEntries(
    INDICATOR_CATEGORIES.map((c) => [c, [] as CatalogEntry[]]),
  ) as Record<(typeof INDICATOR_CATEGORIES)[number], CatalogEntry[]>;

  for (const entry of getCatalog()) {
    out[entry.category].push(entry);
  }
  return out;
}

export { INDICATOR_CATALOG, INDICATOR_CATEGORIES, isMainPane, getCatalogMeta };

registerIndicator(ma);
registerIndicator(emaPlugin);
registerIndicator(boll);
registerIndicator(macd);
registerIndicator(rsi);
registerIndicator(vol);
registerIndicator(vwap);
registerIndicator(atr);
registerIndicator(kdj);
registerIndicator(cci);
registerIndicator(obv);
registerIndicator(dmi);
registerIndicator(wr);
registerIndicator(roc);
registerIndicator(supertrend);
