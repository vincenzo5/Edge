import type { VisibleRange } from '@edge/chart-core';
import { plotWidth } from '@edge/chart-core/layout';
import type { FillGeometry, LineGeometry } from './candleGeometry';

const EMPTY_LINE: LineGeometry = { vertices: new Float32Array(0), vertexCount: 0 };
const EMPTY_FILL: FillGeometry = { vertices: new Float32Array(0), vertexCount: 0 };

/** Build interleaved [x,y] line segments for visible finite values. */
export function buildLineGeometry(values: number[], vp: VisibleRange): LineGeometry {
  const start = Math.max(0, Math.floor(vp.startIndex));
  const end = Math.min(values.length, Math.ceil(vp.endIndex));
  if (end <= start) return { ...EMPTY_LINE };

  const verts: number[] = [];
  let started = false;
  let prevX = 0;
  let prevY = 0;

  for (let i = start; i < end; i++) {
    const v = values[i];
    if (!Number.isFinite(v)) {
      started = false;
      continue;
    }
    const x = vp.xForIndex(i);
    const y = vp.yForPrice(v);
    if (!started) {
      started = true;
      prevX = x;
      prevY = y;
      continue;
    }
    verts.push(prevX, prevY, x, y);
    prevX = x;
    prevY = y;
  }

  const vertices = new Float32Array(verts);
  return { vertices, vertexCount: vertices.length / 2 };
}

/** Build triangle-list bars for histogram-style indicator outputs. */
export function buildHistogramGeometry(
  values: number[],
  vp: VisibleRange,
  zeroPrice = 0,
): FillGeometry {
  const span = vp.endIndex - vp.startIndex;
  if (span <= 0) return { ...EMPTY_FILL };

  const barW = Math.max(1, (plotWidth(vp.width) / span) * 0.7);
  const halfW = barW / 2;
  const zeroY = vp.yForPrice(zeroPrice);
  const start = Math.max(0, Math.floor(vp.startIndex));
  const end = Math.min(values.length, Math.ceil(vp.endIndex));

  const verts: number[] = [];
  for (let i = start; i < end; i++) {
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    const x = vp.xForIndex(i);
    const y = vp.yForPrice(v);
    const top = Math.min(zeroY, y);
    const h = Math.abs(y - zeroY);
    if (h <= 0) continue;
    const left = x - halfW;
    const right = x + halfW;
    const bottom = top + h;
    verts.push(left, top, right, top, right, bottom);
    verts.push(left, top, right, bottom, left, bottom);
  }

  const vertices = new Float32Array(verts);
  return { vertices, vertexCount: vertices.length / 2 };
}
