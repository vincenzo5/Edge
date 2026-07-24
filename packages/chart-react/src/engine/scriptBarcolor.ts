import type { Candle, IndicatorConfig, Theme } from '@edge/chart-core';
import { resolveSeriesStyle } from '@edge/chart-core/indicatorCompute';
import { resolveIndicatorInputs } from '@edge/chart-core/indicatorInputs';
import { resolveScriptBarColors } from '@edge/chart-core';
import {
  resolveIndicatorPlugin,
  resolveIndicatorResultProvider,
  type IndicatorResultProvider,
} from './indicatorResultProvider';

/** Resolve main-pane script barcolor overrides for candle rendering. */
export function resolveMainPaneScriptBarColors(
  indicators: IndicatorConfig[],
  candles: Candle[],
  theme: Theme,
  resultProvider?: IndicatorResultProvider | null,
): Array<string | null> | null {
  const overlays = indicators.filter((ind) => ind.pane === 'main' && ind.visible !== false);
  for (const ind of overlays) {
    const plugin = resolveIndicatorPlugin(ind);
    if (!plugin?.outputs?.length) continue;
    const barcolorOut = plugin.outputs.find((out) => out.plot === 'barcolor');
    if (!barcolorOut) continue;

    const provider = resolveIndicatorResultProvider(resultProvider);
    const data = provider.resolveSeries(plugin, ind, candles);
    if (!data?.[barcolorOut.key]) continue;

    const midIndex = Math.min(
      candles.length - 1,
      Math.max(0, Math.floor(candles.length / 2)),
    );
    const style = resolveSeriesStyle(
      barcolorOut,
      ind,
      plugin,
      theme,
      data[barcolorOut.key][midIndex] ?? null,
    );
    if (!style.visible) continue;

    return resolveScriptBarColors(
      data[barcolorOut.key],
      style.color,
      barcolorOut.colorRules,
    );
  }
  return null;
}
