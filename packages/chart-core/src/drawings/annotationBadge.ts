import type { SerializedDrawing, Theme } from "../contracts";
import {
  ANNOTATION_KIND_LABELS,
  defaultColorForKind,
  type AnnotationKind,
} from "../annotationMetadata";

type Anchor = { x: number; y: number };

export function drawAnnotationBadge(
  ctx: CanvasRenderingContext2D,
  drawing: SerializedDrawing,
  anchor: Anchor,
  theme: Theme,
): void {
  const kind = drawing.metadata?.kind;
  if (!kind) return;

  const status = drawing.metadata?.status;
  const label = ANNOTATION_KIND_LABELS[kind];
  const color = defaultColorForKind(kind, theme);
  const fontSize = 10;
  const padX = 5;
  const padY = 3;

  ctx.save();
  ctx.font = `600 ${fontSize}px sans-serif`;
  const textWidth = ctx.measureText(label).width;
  const w = textWidth + padX * 2;
  const h = fontSize + padY * 2;
  const x = anchor.x + 6;
  const y = anchor.y - h - 4;

  const invalidated = status === "invalidated";
  const proposed = status === "proposed";
  const alpha = invalidated ? 0.45 : proposed ? 0.75 : 1;

  ctx.globalAlpha = alpha;
  ctx.fillStyle = theme === "dark" ? "#12131A" : "#f3f4f6";
  ctx.strokeStyle = color;
  ctx.lineWidth = proposed ? 1 : 1.25;
  if (proposed) ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 3);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = color;
  ctx.fillText(label, x + padX, y + padY + fontSize - 2);

  if (invalidated) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + h / 2);
    ctx.lineTo(x + w - 2, y + h / 2);
    ctx.stroke();
  }

  ctx.restore();
}

export function annotationKindFromDrawing(
  drawing: SerializedDrawing,
): AnnotationKind | undefined {
  return drawing.metadata?.kind;
}
