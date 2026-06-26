import type { Candle, IndicatorConfig, Theme, VisibleRange } from '@edge/chart-core';
import { IndicatorRegistry } from '@edge/chart-core';
import type { IndicatorPlugin } from '@edge/chart-core/plugin-api';
import { getComputedSeries, resolveSeriesStyle } from '@edge/chart-core/indicatorCompute';
import { resolveIndicatorInputs } from '@edge/chart-core/indicatorInputs';
import type { FillGeometry, LineGeometry } from './candleGeometry';
import { buildHistogramGeometry, buildLineGeometry } from './seriesGeometry';

export type IndicatorLineBatch = {
  type: 'line';
  geometry: LineGeometry;
  color: string;
  lineWidth: number;
};

export type IndicatorHistogramBatch = {
  type: 'histogram';
  geometry: FillGeometry;
  color: string;
};

export type IndicatorDrawBatch = IndicatorLineBatch | IndicatorHistogramBatch;

/** True when the indicator can render via declarative WebGL batches (no custom draw()). */
export function isWebGLCompatibleIndicator(plugin: IndicatorPlugin): boolean {
  if (plugin.draw) return false;
  if (!plugin.outputs?.length || !plugin.compute) return false;
  return plugin.outputs.every((out) => {
    const plot = out.plot ?? 'line';
    if (out.fillBetween) return false;
    return plot === 'line' || plot === 'histogram';
  });
}

function batchesForOutputs(
  plugin: IndicatorPlugin,
  instance: IndicatorConfig,
  candles: Candle[],
  vp: VisibleRange,
  theme: Theme,
  data: Record<string, number[]>,
): IndicatorDrawBatch[] {
  const outputs = plugin.outputs ?? [];
  const midIndex = Math.min(
    candles.length - 1,
    Math.max(0, Math.floor((vp.startIndex + vp.endIndex) / 2)),
  );
  const batches: IndicatorDrawBatch[] = [];

  for (const out of outputs) {
    const plot = out.plot ?? 'line';
    const values = data[out.key];
    if (!values) continue;

    const style = resolveSeriesStyle(
      out,
      instance,
      plugin,
      theme,
      values[midIndex] ?? null,
    );
    if (!style.visible) continue;

    if (plot === 'histogram') {
      batches.push({
        type: 'histogram',
        geometry: buildHistogramGeometry(values, vp, 0),
        color: style.color,
      });
      continue;
    }

    if (plot === 'line') {
      batches.push({
        type: 'line',
        geometry: buildLineGeometry(values, vp),
        color: style.color,
        lineWidth: style.lineWidth,
      });
    }
  }

  return batches;
}

/** Build WebGL draw batches for all visible declarative indicators on a pane. */
export function buildIndicatorDrawBatches(
  indicators: IndicatorConfig[],
  candles: Candle[],
  vp: VisibleRange,
  theme: Theme,
): IndicatorDrawBatch[] {
  const batches: IndicatorDrawBatch[] = [];

  for (const instance of indicators) {
    if (instance.visible === false) continue;
    const plugin = IndicatorRegistry.get(instance.name);
    if (!plugin || !isWebGLCompatibleIndicator(plugin)) continue;

    const inputs = resolveIndicatorInputs(plugin, instance);
    const data = getComputedSeries(plugin, candles, inputs);
    if (!data) continue;

    batches.push(...batchesForOutputs(plugin, instance, candles, vp, theme, data));
  }

  return batches;
}
