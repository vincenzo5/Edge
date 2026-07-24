import type { Candle, SerializedDrawing } from "@edge/chart-core";
import { baseDrawing } from "@edge/chart-core/drawings/drawingUtils";

/** Deterministic trend lines spread across the candle series for perf scenarios. */
export function generateTrendLineDrawings(candles: Candle[], count: number): SerializedDrawing[] {
  if (count <= 0 || candles.length < 2) return [];

  const drawings: SerializedDrawing[] = [];
  const span = Math.max(2, Math.floor(candles.length / (count + 1)));

  for (let i = 0; i < count; i += 1) {
    const startIndex = Math.min(candles.length - 2, (i + 1) * span);
    const endIndex = Math.min(candles.length - 1, startIndex + span);
    const start = candles[startIndex]!;
    const end = candles[endIndex]!;

    drawings.push(
      baseDrawing("trend_line", `Trend ${i + 1}`, [
        { timestamp: start.t, value: start.c, dataIndex: startIndex },
        { timestamp: end.t, value: end.c, dataIndex: endIndex },
      ]),
    );
  }

  return drawings;
}
