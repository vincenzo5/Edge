import { describe, expect, it } from 'vitest';
import type { VisibleRange } from '@edge/chart-core';
import { buildHistogramGeometry, buildLineGeometry } from './seriesGeometry';

function mockViewport(values: number[]): VisibleRange {
  const width = 800;
  const height = 400;
  const startIndex = 0;
  const endIndex = values.length;
  const visible = endIndex - startIndex;
  const pw = width - 50;
  const ph = height - 30;
  return {
    startIndex,
    endIndex,
    priceMin: 0,
    priceMax: 100,
    width,
    height,
    xForIndex: (i: number) => ((i - startIndex) / visible) * pw,
    yForPrice: (p: number) => ((100 - p) / 100) * ph,
    indexForX: (x: number) => startIndex + (x / pw) * visible,
    priceForY: (y: number) => 100 - (y / ph) * 100,
  };
}

describe('seriesGeometry', () => {
  it('builds line segments for finite values', () => {
    const geometry = buildLineGeometry([10, 20, Number.NaN, 30], mockViewport([10, 20, 30, 40]));
    expect(geometry.vertexCount).toBeGreaterThan(0);
    expect(geometry.vertices.length % 2).toBe(0);
  });

  it('builds histogram triangles for finite values', () => {
    const geometry = buildHistogramGeometry([10, -5, 15], mockViewport([10, -5, 15]), 0);
    expect(geometry.vertexCount).toBeGreaterThan(0);
    expect(geometry.vertexCount % 3).toBe(0);
  });
});
