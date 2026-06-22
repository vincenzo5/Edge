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
