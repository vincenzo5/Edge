import type { Candle, IndicatorConfig, Theme, VisibleRange } from '@edge/chart-core';
import type { IndicatorPlugin } from '@edge/chart-core/plugin-api';
import { resolveSeriesStyle } from '@edge/chart-core/indicatorCompute';
import { resolveIndicatorResultProvider, resolveIndicatorPlugin, type IndicatorResultProvider } from '../indicatorResultProvider';
import type { FillGeometry, LineGeometry } from './candleGeometry';
import type { GeometryBufferPool } from './geometryBufferPool';
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
  if (!plugin.outputs?.length) return false;
  return plugin.outputs.every((out) => {
    const plot = out.plot ?? 'line';
    if (out.fillBetween) return false;
    if (plot === 'marker' || plot === 'bgcolor' || plot === 'barcolor') return false;
    if (out.style && out.style !== 'line') return false;
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
  pool?: GeometryBufferPool,
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
        geometry: buildHistogramGeometry(values, vp, 0, pool, `${instance.id}:${out.key}:hist`),
        color: style.color,
      });
      continue;
    }

    if (plot === 'line') {
      batches.push({
        type: 'line',
        geometry: buildLineGeometry(values, vp, pool, `${instance.id}:${out.key}:line`),
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
  resultProvider?: IndicatorResultProvider | null,
  pool?: GeometryBufferPool,
): IndicatorDrawBatch[] {
  const batches: IndicatorDrawBatch[] = [];

  for (const instance of indicators) {
    if (instance.visible === false) continue;
    const plugin = resolveIndicatorPlugin(instance);
    if (!plugin || !isWebGLCompatibleIndicator(plugin)) continue;

    const provider = resolveIndicatorResultProvider(resultProvider);
    const data = provider.resolveSeries(plugin, instance, candles);
    if (!data) continue;

    batches.push(...batchesForOutputs(plugin, instance, candles, vp, theme, data, pool));
  }

  return batches;
}
