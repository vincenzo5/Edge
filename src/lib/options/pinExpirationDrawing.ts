import type { SerializedDrawing } from "@/lib/chartConfig";
import { expirationToTimestamp } from "./optionsClient";

export function expirationDrawingId(expiration: string): string {
  return `opt-exp-pin-${expiration}`;
}

export function createExpirationVerticalLine(
  expiration: string,
  symbol: string,
): SerializedDrawing {
  const timestamp = expirationToTimestamp(expiration);
  return {
    id: expirationDrawingId(expiration),
    name: "vertical_line",
    label: `${symbol} exp ${expiration}`,
    points: [{ timestamp, value: 0 }],
    visible: true,
    locked: false,
    zLevel: 0,
    paneId: "price",
    styles: {
      lineColor: "#a78bfa",
      lineWidth: 1,
      lineDash: [6, 4],
    },
  };
}

export function isExpirationPinned(
  drawings: SerializedDrawing[],
  expiration: string,
): boolean {
  const id = expirationDrawingId(expiration);
  return drawings.some((drawing) => drawing.id === id);
}

export function pinExpirationDrawing(
  drawings: SerializedDrawing[],
  expiration: string,
  symbol: string,
): SerializedDrawing[] {
  if (isExpirationPinned(drawings, expiration)) return drawings;
  return [...drawings, createExpirationVerticalLine(expiration, symbol)];
}
