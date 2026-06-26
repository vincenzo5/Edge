import type { DrawingPlugin } from '../plugin-api';
import type { SerializedDrawing } from '../contracts';
import { plotToPoint } from '../drawingCoords';
import { plotWidth } from '../layout';
import { drawControlPoints, strokeFromStyles } from './primitives';
import { baseDrawing, plotsForPoints, updateTwoPointPreview } from './drawingUtils';
import { getChartColors as getColors } from '../themeTokens';
import { resolveDrawingStyles } from '../drawingStyles';
import {
  computeRiskMetrics,
  formatRiskSummary,
  formatTargetLabel,
} from '../risk/riskCompute';
import { validateTradeSetup } from '../risk/riskValidation';
import { isOptionTradeSetup } from '../risk/optionRiskFormat';
import {
  readTradeSetupFromDrawing,
  riskComputedPayload,
  riskRulerHitTest,
  targetPlotYsForSetup,
  tradeSetupFromPoints,
  plotYForPrice,
} from '../risk/riskDrawing';

const ENTRY_COLOR = '#22c55e';
const STOP_COLOR = '#ef4444';
const TARGET_COLOR = '#3b82f6';
const BREAKEVEN_COLOR = '#f59e0b';

function horizontalLine(
  ctx: CanvasRenderingContext2D,
  y: number,
  xStart: number,
  xEnd: number,
  color: string,
  dash: number[] = [],
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(xStart, y);
  ctx.lineTo(xEnd, y);
  ctx.stroke();
  ctx.restore();
}

function drawLabelBox(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  theme: import('../contracts').Theme,
) {
  const colors = getColors(theme);
  ctx.font = '11px system-ui, sans-serif';
  const metrics = ctx.measureText(text);
  const padX = 6;
  const boxW = metrics.width + padX * 2;
  const boxH = 18;
  ctx.fillStyle = colors.axisBg;
  ctx.strokeStyle = colors.axisBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - boxW / 2, y - boxH / 2, boxW, boxH, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function finalizeRiskRuler(draft: SerializedDrawing): SerializedDrawing {
  const setup = tradeSetupFromPoints(draft.points);
  if (!setup) return draft;
  try {
    const validated = validateTradeSetup(setup);
    const metrics = computeRiskMetrics(validated);
    return {
      ...draft,
      metadata: {
        ...draft.metadata,
        fields: {
          ...draft.metadata?.fields,
          riskSetup: validated,
        },
        computed: riskComputedPayload(metrics),
      },
    };
  } catch {
    return draft;
  }
}

export const riskRuler: DrawingPlugin = {
  name: 'risk_ruler',
  defaultLabel: 'Risk Ruler',
  placement: 'multi-point',
  maxControlPoints: 5,
  isPlacementComplete: (draft) => draft.points.length >= 2,
  create(start) {
    return baseDrawing('risk_ruler', 'Risk Ruler', [start, { ...start }]);
  },
  updatePreview(draft, cursor) {
    if (draft.points.length <= 2) {
      return updateTwoPointPreview(draft, cursor);
    }
    const points = [...draft.points];
    points[points.length - 1] = {
      timestamp: cursor.timestamp,
      value: cursor.value,
      dataIndex: cursor.dataIndex,
    };
    return { ...draft, points };
  },
  finalize(draft, _vp, _candles) {
    return finalizeRiskRuler(draft);
  },
  draw(ctx, d, vp, theme, selected, candles, opts) {
    if (d.points.length < 2) return;
    const showTimeAxis = opts?.showTimeAxis ?? true;
    const plots = plotsForPoints(d, vp, candles, showTimeAxis);
    const [entryPlot, stopPlot, ...targetPlots] = plots;
    const setup = readTradeSetupFromDrawing(d);
    const styles = resolveDrawingStyles(d, theme, selected);
    const { stroke, lineWidth, dash } = strokeFromStyles(styles, theme, selected, opts?.preview);
    const plotLeft = 0;
    const plotRight = plotWidth(vp.width);

    if (entryPlot && stopPlot) {
      ctx.save();
      ctx.fillStyle =
        theme === 'dark' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.12)';
      ctx.fillRect(
        plotLeft,
        Math.min(entryPlot.y, stopPlot.y),
        plotRight,
        Math.abs(entryPlot.y - stopPlot.y),
      );
      ctx.restore();
    }

    horizontalLine(ctx, entryPlot.y, plotLeft, plotRight, ENTRY_COLOR, dash);
    horizontalLine(ctx, stopPlot.y, plotLeft, plotRight, STOP_COLOR, dash);

    const optionsMode = setup != null && isOptionTradeSetup(setup);
    const entryPrice = setup?.entries[0]?.price ?? 0;
    const stopPrice = setup?.stops[0]?.price ?? 0;

    if (optionsMode && setup?.breakevens?.length) {
      const targetPrices = new Set(setup.targets.map((target) => target.price));
      for (const breakeven of setup.breakevens) {
        if (targetPrices.has(breakeven)) continue;
        const y = plotYForPrice(breakeven, entryPrice, entryPlot.y, stopPrice, stopPlot.y);
        horizontalLine(ctx, y, plotLeft, plotRight, BREAKEVEN_COLOR, [2, 4]);
      }
    }

    setup?.targets.forEach((target, index) => {
      const plot = targetPlots[index];
      const y =
        plot?.y ??
        plotYForPrice(
          target.price,
          setup.entries[0]!.price,
          entryPlot.y,
          setup.stops[0]!.price,
          stopPlot.y,
        );
      horizontalLine(ctx, y, plotLeft, plotRight, TARGET_COLOR, [4, 4]);
    });

    if (!opts?.preview && setup) {
      try {
        const metrics = computeRiskMetrics(setup);
        const summary = formatRiskSummary(metrics);
        drawLabelBox(ctx, summary, plotRight / 2, Math.min(entryPlot.y, stopPlot.y) - 14, theme);
        metrics.targets.forEach((target, index) => {
          const plot = targetPlots[index];
          const y =
            plot?.y ??
            plotYForPrice(
              target.price,
              metrics.entryPrice,
              entryPlot.y,
              metrics.stopPrice,
              stopPlot.y,
            );
          const targetLabel =
            optionsMode && setup.targets[index]?.label
              ? `${setup.targets[index]!.label} @ ${formatTargetLabel(target).split('@ ')[1] ?? formatTargetLabel(target)}`
              : formatTargetLabel(target);
          drawLabelBox(
            ctx,
            targetLabel,
            Math.min(plotRight - 80, plotLeft + 120),
            y,
            theme,
          );
        });
      } catch {
        // Invalid partial setup during restore — skip labels until valid.
      }
    }

    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    if (opts?.preview || dash.length > 0) ctx.setLineDash(opts?.preview ? [4, 4] : dash);
    ctx.beginPath();
    ctx.moveTo(entryPlot.x, entryPlot.y);
    ctx.lineTo(stopPlot.x, stopPlot.y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (selected && !opts?.preview) {
      drawControlPoints(ctx, plots, theme, true);
    }
  },
  hitTest(px, py, d, vp, candles, showTimeAxis = true) {
    if (d.points.length < 2) return false;
    const plots = plotsForPoints(d, vp, candles, showTimeAxis);
    const [entryPlot, stopPlot, ...targetPlots] = plots;
    const setup = readTradeSetupFromDrawing(d);
    const targetYs = setup
      ? targetPlotYsForSetup(setup, entryPlot, stopPlot, targetPlots)
      : [];
    return riskRulerHitTest(px, py, entryPlot, stopPlot, plotWidth(vp.width), targetYs);
  },
  getControlPoints(d, vp, candles, showTimeAxis = true) {
    return plotsForPoints(d, vp, candles, showTimeAxis);
  },
  updateFromControl(d, cpIndex, plotX, plotY, vp, candles, showTimeAxis = true) {
    const pt = plotToPoint(plotX, plotY, vp, candles, { showTimeAxis });
    const points = d.points.map((p, i) =>
      i === cpIndex
        ? { timestamp: pt.timestamp, value: pt.value, dataIndex: pt.dataIndex }
        : p,
    );
    return finalizeRiskRuler({ ...d, points });
  },
};
