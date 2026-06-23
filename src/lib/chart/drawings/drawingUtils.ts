import type { SerializedDrawing } from '../contracts';
import type { Candle, VisibleRange } from '../contracts';
import type { DrawingPoint } from '../drawingCoords';
import { pointToPlot } from '../drawingCoords';

export function baseDrawing(name: string, label: string, points: DrawingPoint[]): SerializedDrawing {
  return {
    name,
    label,
    points: points.map((p) => ({
      timestamp: p.timestamp,
      value: p.value,
      dataIndex: p.dataIndex,
    })),
    visible: true,
    locked: false,
    zLevel: 0,
    paneId: 'price',
  };
}

export function plotsForPoints(
  drawing: SerializedDrawing,
  vp: VisibleRange,
  candles: Candle[],
  showTimeAxis: boolean
) {
  return drawing.points.map((p) => pointToPlot(p, vp, candles, showTimeAxis));
}

export function updateTwoPointPreview(
  draft: SerializedDrawing,
  cursor: DrawingPoint
): SerializedDrawing {
  const points = [...draft.points];
  if (points.length < 2) {
    points.push({ timestamp: cursor.timestamp, value: cursor.value, dataIndex: cursor.dataIndex });
  } else {
    points[1] = { timestamp: cursor.timestamp, value: cursor.value, dataIndex: cursor.dataIndex };
  }
  return { ...draft, points };
}

/** Four corner plot positions from two diagonal anchor points. */
export function rectCornerPlots(
  a: { x: number; y: number },
  b: { x: number; y: number }
): Array<{ x: number; y: number }> {
  return [
    { x: a.x, y: a.y },
    { x: b.x, y: a.y },
    { x: b.x, y: b.y },
    { x: a.x, y: b.y },
  ];
}

/** Map dragged corner index to stored two-point rectangle geometry. */
export function updateRectFromCorner(
  d: SerializedDrawing,
  cpIndex: number,
  pt: DrawingPoint
): SerializedDrawing {
  if (d.points.length < 2) return d;
  const points = d.points.map((p) => ({ ...p }));
  switch (cpIndex) {
    case 0:
      points[0] = { ...points[0], ...pt };
      break;
    case 1:
      points[1] = {
        ...points[1],
        timestamp: pt.timestamp,
        dataIndex: pt.dataIndex,
      };
      points[0] = { ...points[0], value: pt.value };
      break;
    case 2:
      points[1] = { ...points[1], ...pt };
      break;
    case 3:
      points[0] = {
        ...points[0],
        timestamp: pt.timestamp,
        dataIndex: pt.dataIndex,
      };
      points[1] = { ...points[1], value: pt.value };
      break;
    default:
      break;
  }
  return { ...d, points };
}

/** Commit cursor as next fixed control point (variable-N click step, e.g. polylines). */
export function appendPointPreview(
  draft: SerializedDrawing,
  point: DrawingPoint
): SerializedDrawing {
  return {
    ...draft,
    points: [
      ...draft.points,
      {
        timestamp: point.timestamp,
        value: point.value,
        dataIndex: point.dataIndex,
      },
    ],
  };
}
