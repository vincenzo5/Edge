import type { DrawingPlugin } from '../plugin-api';
import type { Candle, SerializedDrawing, Theme } from '../contracts';
import { plotToPoint } from '../drawingCoords';
import {
  computeRiskMetrics,
} from '../risk/riskCompute';
import { validateTradeSetup } from '../risk/riskValidation';
import {
  readTradeSetupFromDrawing,
  riskComputedPayload,
  tradeSetupFromPoints,
} from '../risk/riskDrawing';
import {
  formatEntryLabels,
  formatStopLabel,
  formatTargetLabel,
  resolvePositionQty,
} from '../risk/positionLabels';
import type { RiskDirection } from '../risk/riskTypes';
import { drawControlPoints } from './primitives';
import { baseDrawing, plotsForPoints, updateTwoPointPreview } from './drawingUtils';
import {
  boxFromPoints,
  defaultPositionPoints,
  expandTwoPointDraft,
  positionControlPoints,
  positionHitTest,
  positionPlotBounds,
  profitRLevels,
  repairPositionPoints,
  updatePositionFromControl,
} from './positionGeometry';
import { plotWidth } from '../layout';

const PROFIT_FILL_DARK = 'rgba(34, 197, 94, 0.15)';
const PROFIT_FILL_LIGHT = 'rgba(34, 197, 94, 0.2)';
const LOSS_FILL_DARK = 'rgba(239, 68, 68, 0.15)';
const LOSS_FILL_LIGHT = 'rgba(239, 68, 68, 0.2)';
const ENTRY_LINE_COLOR = '#94a3b8';
const R_TICK_COLOR_DARK = 'rgba(34, 197, 94, 0.75)';
const R_TICK_COLOR_LIGHT = 'rgba(22, 163, 74, 0.85)';
const R_TICK_LENGTH_PX = 12;
const R_LABEL_MIN_WIDTH_PX = 16;

function profitFill(theme: Theme) {
  return theme === 'dark' ? PROFIT_FILL_DARK : PROFIT_FILL_LIGHT;
}

function lossFill(theme: Theme) {
  return theme === 'dark' ? LOSS_FILL_DARK : LOSS_FILL_LIGHT;
}

function rTickColor(theme: Theme) {
  return theme === 'dark' ? R_TICK_COLOR_DARK : R_TICK_COLOR_LIGHT;
}

function drawProfitRYardLines(
  ctx: CanvasRenderingContext2D,
  entry: number,
  stop: number,
  target: number,
  direction: RiskDirection,
  leftX: number,
  rightX: number,
  vp: { yForPrice: (p: number) => number },
  theme: Theme,
) {
  const levels = profitRLevels(entry, stop, target, direction);
  if (levels.length === 0) return;

  const tickColor = rTickColor(theme);
  const tickEndX = leftX + R_TICK_LENGTH_PX;
  const labelX = tickEndX + 3;

  ctx.save();
  ctx.strokeStyle = tickColor;
  ctx.fillStyle = tickColor;
  ctx.lineWidth = 1;
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  for (const { r, price } of levels) {
    const y = vp.yForPrice(price);
    ctx.beginPath();
    ctx.moveTo(leftX, y);
    ctx.lineTo(tickEndX, y);
    ctx.stroke();

    if (rightX - labelX >= R_LABEL_MIN_WIDTH_PX) {
      ctx.fillText(`${r}R`, labelX, y);
    }
  }

  ctx.restore();
}

function drawPositionLabelBox(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  bgColor: string,
  borderColor?: string,
) {
  ctx.font = '11px system-ui, sans-serif';
  const lineHeight = 14;
  const padX = 6;
  const padY = 4;
  const maxWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));
  const boxW = maxWidth + padX * 2;
  const boxH = lines.length * lineHeight + padY * 2;
  const left = x - boxW / 2;
  const top = y - boxH - 4;

  ctx.fillStyle = bgColor;
  ctx.strokeStyle = borderColor ?? bgColor;
  ctx.lineWidth = borderColor ? 2 : 1;
  ctx.beginPath();
  ctx.roundRect(left, top, boxW, boxH, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, index) => {
    const lineY = top + padY + lineHeight / 2 + index * lineHeight;
    ctx.fillText(line, x, lineY);
  });
}

function drawSingleLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  bgColor: string,
) {
  drawPositionLabelBox(ctx, [text], x, y, bgColor);
}

function finalizePosition(draft: SerializedDrawing, direction: RiskDirection): SerializedDrawing {
  let expanded = draft.points.length < 4 ? expandTwoPointDraft(draft, direction) : draft;
  // Candles are not available here; timestamp-0 repair happens at draw time via repairPositionPoints.
  const withStickDefault: SerializedDrawing = {
    ...expanded,
    styles: {
      stickEntryToLastPrice: true,
      ...expanded.styles,
    },
  };
  const setup = tradeSetupFromPoints(withStickDefault.points.slice(0, 3));
  if (!setup) return withStickDefault;
  try {
    const validated = validateTradeSetup({ ...setup, direction });
    const metrics = computeRiskMetrics(validated);
    const qty = resolvePositionQty(withStickDefault.metadata?.fields?.qty, metrics.positionSize);
    return {
      ...withStickDefault,
      metadata: {
        ...withStickDefault.metadata,
        fields: {
          ...withStickDefault.metadata?.fields,
          riskSetup: validated,
          qty,
        },
        computed: riskComputedPayload(metrics),
      },
    };
  } catch {
    return withStickDefault;
  }
}

function lastCandleClose(candles: Candle[]): number | null {
  const last = candles[candles.length - 1];
  return last?.c ?? null;
}

export function shouldShowPositionLabels(
  selected: boolean,
  opts?: { preview?: boolean; hovered?: boolean },
): boolean {
  return (selected || opts?.hovered === true) && !opts?.preview;
}

export function createPositionPlugin(
  direction: RiskDirection,
  registryName: string,
  defaultLabel: string,
): DrawingPlugin {
  return {
    name: registryName,
    defaultLabel,
    placement: 'instant',
    create(start, _vp, candles) {
      const defaults = defaultPositionPoints(direction, candles);
      if (defaults) {
        return baseDrawing(registryName, defaultLabel, defaults);
      }
      return baseDrawing(registryName, defaultLabel, [start, { ...start }]);
    },
    updatePreview(draft, cursor) {
      return updateTwoPointPreview(draft, cursor);
    },
    finalize(draft) {
      return finalizePosition(draft, direction);
    },
    draw(ctx, d, vp, theme, selected, candles, opts) {
      if (d.points.length < 2) return;
      const showTimeAxis = opts?.showTimeAxis ?? true;
      const expanded =
        d.points.length >= 4 ? d : expandTwoPointDraft(d, direction);
      const repairedPoints = repairPositionPoints(expanded.points, candles);
      const repaired =
        repairedPoints === expanded.points
          ? expanded
          : { ...expanded, points: repairedPoints };
      const plots = plotsForPoints(repaired, vp, candles, showTimeAxis);
      if (plots.length < 4) return;

      const [entryPlot, stopPlot, targetPlot, rightPlot] = plots;
      const bounds = positionPlotBounds(entryPlot, stopPlot, targetPlot, rightPlot);
      const { leftX, rightX, entryY, stopY, targetY } = bounds;
      const width = Math.max(rightX - leftX, 1);
      const pw = plotWidth(vp.width);
      const clipLeft = Math.max(0, leftX);
      const clipRight = Math.min(pw, rightX);
      const clipWidth = Math.max(clipRight - clipLeft, 0);

      const profitZone =
        direction === 'long'
          ? { top: targetY, height: entryY - targetY }
          : { top: entryY, height: targetY - entryY };
      const lossZone =
        direction === 'long'
          ? { top: entryY, height: stopY - entryY }
          : { top: stopY, height: entryY - stopY };

      if (clipWidth > 0) {
        ctx.save();
        ctx.fillStyle = profitFill(theme);
        ctx.fillRect(clipLeft, profitZone.top, clipWidth, Math.abs(profitZone.height));
        ctx.fillStyle = lossFill(theme);
        ctx.fillRect(clipLeft, lossZone.top, clipWidth, Math.abs(lossZone.height));
        ctx.restore();
      }

      ctx.save();
      ctx.strokeStyle = ENTRY_LINE_COLOR;
      ctx.lineWidth = 1;
      ctx.setLineDash(opts?.preview ? [4, 4] : []);
      ctx.beginPath();
      ctx.moveTo(clipLeft, entryY);
      ctx.lineTo(clipLeft + clipWidth, entryY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      const box = boxFromPoints(repaired.points, direction);
      if (box) {
        drawProfitRYardLines(
          ctx,
          box.entry,
          box.stop,
          box.target,
          direction,
          clipLeft,
          clipLeft + clipWidth,
          vp,
          theme,
        );
      }

      if (shouldShowPositionLabels(selected, opts)) {
        const setup = readTradeSetupFromDrawing(repaired);
        if (box && setup) {
          try {
            const metrics = computeRiskMetrics(setup);
            const qty = resolvePositionQty(
              repaired.metadata?.fields?.qty,
              metrics.positionSize,
            );
            const lastPrice = lastCandleClose(candles);
            const labelInput = { ...box, direction, qty, lastPrice };
            const centerX = clipLeft + clipWidth / 2;

            drawSingleLabel(
              ctx,
              formatTargetLabel(labelInput),
              centerX,
              targetY,
              '#15803d',
            );
            drawPositionLabelBox(
              ctx,
              formatEntryLabels(labelInput),
              centerX,
              entryY,
              '#b91c1c',
              '#ffffff',
            );
            drawSingleLabel(
              ctx,
              formatStopLabel(labelInput),
              centerX,
              stopY,
              '#b91c1c',
            );
          } catch {
            // Skip labels until setup is valid.
          }
        }
      }

      if (selected && !opts?.preview && repaired.points.length >= 4) {
        drawControlPoints(ctx, positionControlPoints(bounds), theme, true);
      }
    },
    hitTest(px, py, d, vp, candles, showTimeAxis = true) {
      if (d.points.length < 2) return false;
      const expanded = d.points.length >= 4 ? d : expandTwoPointDraft(d, direction);
      const repaired = {
        ...expanded,
        points: repairPositionPoints(expanded.points, candles),
      };
      const plots = plotsForPoints(repaired, vp, candles, showTimeAxis);
      if (plots.length < 4) return false;
      const [entryPlot, stopPlot, targetPlot, rightPlot] = plots;
      const bounds = positionPlotBounds(entryPlot, stopPlot, targetPlot, rightPlot);
      return positionHitTest(px, py, bounds, direction);
    },
    getControlPoints(d, vp, candles, showTimeAxis = true) {
      if (d.points.length < 4) return [];
      const repaired = {
        ...d,
        points: repairPositionPoints(d.points, candles),
      };
      const plots = plotsForPoints(repaired, vp, candles, showTimeAxis);
      if (plots.length < 4) return [];
      const [entryPlot, stopPlot, targetPlot, rightPlot] = plots;
      return positionControlPoints(
        positionPlotBounds(entryPlot, stopPlot, targetPlot, rightPlot),
      );
    },
    updateFromControl(d, cpIndex, plotX, plotY, vp, candles, showTimeAxis = true) {
      const pt = plotToPoint(plotX, plotY, vp, candles, { showTimeAxis });
      const updated = updatePositionFromControl(d, cpIndex, pt);
      return finalizePosition(updated, direction);
    },
  };
}
