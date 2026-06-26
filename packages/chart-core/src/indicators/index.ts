/**
 * @edge/chart-core/indicators — indicator registry, catalog, and starter plugins.
 */
export {
  registerIndicator,
  getIndicator,
  getAllIndicators,
  isIndicatorImplemented,
  getCatalogEntry,
  getCatalog,
} from './registry';
export type { CatalogEntry } from './registry';
export { INDICATOR_CATALOG, INDICATOR_CATEGORIES, isMainPane, getCatalogMeta } from './catalog';
export type { IndicatorMeta } from './catalog';
