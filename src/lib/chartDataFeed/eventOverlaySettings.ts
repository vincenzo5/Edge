import type { ChartEventKind } from '@edge/chart-core';
import {
  mergeChartSettings,
  type ChartSettings,
  type RequiredChartSettings,
} from '@/lib/chart/chartSettings';
import { shouldIncludeMacroChartEvents } from './macroChartPins';

/** Derive enabled event overlay kinds from chart settings and symbol context. */
export function eventKindsFromChartSettings(
  settings: ChartSettings | RequiredChartSettings | undefined,
  symbol: string,
): ChartEventKind[] {
  const merged = mergeChartSettings(settings);
  const kinds: ChartEventKind[] = [];

  if (merged.events.showEarnings) kinds.push('earnings');
  if (merged.events.showDividend) kinds.push('dividend');
  if (merged.events.showSplit) kinds.push('split');
  if (merged.events.showFiling) kinds.push('filing');
  if (merged.events.showMacro && shouldIncludeMacroChartEvents(symbol)) {
    kinds.push('macro');
  }
  if (merged.events.showNews) kinds.push('news');
  if (merged.events.showOptionsExpiration) kinds.push('options_expiration');

  return kinds;
}
