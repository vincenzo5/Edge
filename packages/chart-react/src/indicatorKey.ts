import type { IndicatorConfig } from '@edge/chart-core';

export type IndicatorKey = string;

export function indicatorKey(ind: IndicatorConfig): IndicatorKey {
  return ind.id;
}

export function parseIndicatorKey(
  key: IndicatorKey,
  indicators: IndicatorConfig[],
): IndicatorConfig | null {
  return indicators.find((ind) => ind.id === key) ?? null;
}

export function legacyParseIndicatorKey(
  key: IndicatorKey,
): Pick<IndicatorConfig, 'name' | 'pane'> | null {
  const parts = key.split('::');
  if (parts.length < 2) return null;
  const pane = parts.pop() as 'main' | 'sub';
  return { name: parts.join('::'), pane };
}
