import type { Candle, Theme, VisibleRange } from './contracts';
import { plotWidth } from './layout';
import { yForPricePlot } from './drawingCoords';
import type { ScriptObjectDef } from './scriptContracts';
import { normalizeScriptBoxBounds } from './scriptContracts';

export type ScriptObjectDrawEntry = {
  instanceId: string;
  objectId: string;
  def: ScriptObjectDef;
};

function barToX(bar: number, vp: VisibleRange): number {
  return vp.xForIndex(Math.floor(bar));
}

function drawScriptBox(
  ctx: CanvasRenderingContext2D,
  def: Extract<ScriptObjectDef, { kind: 'box' }>,
  vp: VisibleRange,
): void {
  const bounds = normalizeScriptBoxBounds(def);
  const x1 = barToX(bounds.leftBar, vp);
  const x2 = barToX(bounds.rightBar, vp);
  const yTop = yForPricePlot(bounds.top, vp);
  const yBottom = yForPricePlot(bounds.bottom, vp);
  const x = Math.min(x1, x2);
  const y = Math.min(yTop, yBottom);
  const w = Math.abs(x2 - x1);
  const h = Math.abs(yBottom - yTop);

  if (def.color) {
    ctx.fillStyle = def.color;
    ctx.fillRect(x, y, w, h);
  }
  const borderColor = def.borderColor ?? def.color ?? 'rgba(100,116,139,0.8)';
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = def.borderWidth ?? 1;
  ctx.strokeRect(x, y, w, h);
}

function drawScriptLabel(
  ctx: CanvasRenderingContext2D,
  def: Extract<ScriptObjectDef, { kind: 'label' }>,
  vp: VisibleRange,
  theme: Theme,
): void {
  const x = barToX(def.bar, vp);
  const y = yForPricePlot(def.price, vp);
  const fontSize = 12;
  ctx.font = `${fontSize}px sans-serif`;
  const text = def.text;
  const metrics = ctx.measureText(text);
  const padX = 4;
  const padY = 2;
  const boxW = metrics.width + padX * 2;
  const boxH = fontSize + padY * 2;
  const align = def.align ?? 'left';
  let drawX = x;
  if (align === 'center') drawX = x - boxW / 2;
  if (align === 'right') drawX = x - boxW;

  if (def.backgroundColor) {
    ctx.fillStyle = def.backgroundColor;
    ctx.fillRect(drawX, y - boxH, boxW, boxH);
  }
  ctx.fillStyle = def.color ?? (theme === 'dark' ? '#e2e8f0' : '#1e293b');
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, drawX + padX, y - padY / 2);
}

function drawScriptLevel(
  ctx: CanvasRenderingContext2D,
  def: Extract<ScriptObjectDef, { kind: 'level' }>,
  vp: VisibleRange,
  candles: Candle[],
): void {
  const y = yForPricePlot(def.price, vp);
  const pw = plotWidth(vp.width);
  const leftBar = def.leftBar != null ? Math.floor(def.leftBar) : 0;
  const rightBar = def.rightBar != null ? Math.floor(def.rightBar) : Math.max(0, candles.length - 1);
  const x1 = barToX(leftBar, vp);
  const x2 = barToX(rightBar, vp);
  const xStart = Math.max(0, Math.min(x1, x2));
  const xEnd = Math.min(pw, Math.max(x1, x2));

  ctx.strokeStyle = def.color ?? 'rgba(245,158,11,0.9)';
  ctx.lineWidth = def.lineWidth ?? 1;
  ctx.beginPath();
  ctx.moveTo(xStart, y);
  ctx.lineTo(xEnd, y);
  ctx.stroke();
}

export function drawScriptObjects(
  ctx: CanvasRenderingContext2D,
  entries: readonly ScriptObjectDrawEntry[],
  vp: VisibleRange,
  candles: Candle[],
  theme: Theme,
): void {
  if (entries.length === 0) return;
  ctx.save();
  for (const entry of entries) {
    const { def } = entry;
    if (def.kind === 'box') {
      drawScriptBox(ctx, def, vp);
    } else if (def.kind === 'label') {
      drawScriptLabel(ctx, def, vp, theme);
    } else if (def.kind === 'level') {
      drawScriptLevel(ctx, def, vp, candles);
    }
  }
  ctx.restore();
}
