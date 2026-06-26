import type { IndicatorConfig } from './contracts';
import { PRICE_PANE_KEY } from './contracts';

/** Human-readable pane label for Object Tree and UI chrome. */
export function resolvePaneLabel(
  paneId: string,
  indicators: IndicatorConfig[],
): string {
  if (paneId === PRICE_PANE_KEY || paneId === 'price') return 'Price';
  const ind = indicators.find((i) => i.id === paneId);
  if (ind) return ind.name;
  return paneId;
}
