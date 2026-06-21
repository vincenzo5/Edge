export type { IndicatorCategory, ParamDef } from './chart/plugin-api';
export type { IndicatorMeta } from './chart/indicators/catalog';
export type { CatalogEntry } from './chart/indicators/registry';
export {
  getCatalog,
  getCatalogByCategory,
  getCatalogEntry,
  getCatalogMeta,
  isMainPane,
  INDICATOR_CATALOG,
  INDICATOR_CATEGORIES,
} from './chart/indicators/registry';

import { getCatalog } from './chart/indicators/registry';
import type { IndicatorConfig } from './chartConfig';

/** Flat catalog metadata (backward compatibility). */
export const INDICATORS = getCatalog().map(
  ({ name, category, defaultPane, description }) => ({
    name,
    category,
    defaultPane,
    description,
  }),
);

export const INDICATOR_NAMES = new Set(INDICATORS.map((i) => i.name));

export function indicatorConfigEqual(a: IndicatorConfig, b: IndicatorConfig): boolean {
  return a.name === b.name && a.pane === b.pane;
}
