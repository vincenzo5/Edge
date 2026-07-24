import { cloneCellConfig, type CellConfig } from "@/lib/chartConfig";
import type { SerializedDrawing } from "@edge/chart-core/contracts";
import {
  isPositionDrawingName,
  positionOrderLevelsFromDrawing,
} from "@/lib/trading/positionTradeSetup";
import type { JournalTradePlanLevels } from "@/lib/persistence/schemas/journal";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import {
  createJournalTradeChartSnapshotRemote,
  uploadJournalTradeScreenshot,
} from "@/lib/persistence/client/journalClient";

export type CaptureTradeChartForkResult =
  | { ok: true; snapshotId: string }
  | { ok: false; error: string };

export function symbolsMatchForTradeCapture(
  chartSymbol: string,
  tradeSymbol: string,
): boolean {
  return chartSymbol.trim().toUpperCase() === tradeSymbol.trim().toUpperCase();
}

export function extractPlanLevelsFromCellConfig(
  cellConfig: CellConfig,
): JournalTradePlanLevels | null {
  const positionDrawing = findLatestPositionDrawing(cellConfig.drawings);
  if (!positionDrawing) return null;
  const levels = positionOrderLevelsFromDrawing(positionDrawing);
  if (!levels) return null;
  return {
    direction: levels.direction,
    side: levels.side,
    entry: levels.entry,
    stop: levels.stop,
    target: levels.target,
    riskRewardRatio: levels.riskRewardRatio,
  };
}

function findLatestPositionDrawing(drawings: SerializedDrawing[]): SerializedDrawing | null {
  for (let index = drawings.length - 1; index >= 0; index -= 1) {
    const drawing = drawings[index];
    if (drawing && isPositionDrawingName(drawing.name)) {
      return drawing;
    }
  }
  return null;
}

export function buildTradeChartForkCellConfig(cellConfig: CellConfig): CellConfig {
  return cloneCellConfig(cellConfig, { sharedDrawingIds: false });
}

export async function captureTradeChartFork(args: {
  trade: Pick<JournalTradeResponse, "id" | "symbol">;
  cellConfig: CellConfig;
  captureScreenshot?: () => Promise<Blob>;
  label?: string | null;
}): Promise<CaptureTradeChartForkResult> {
  if (!symbolsMatchForTradeCapture(args.cellConfig.symbol, args.trade.symbol)) {
    return {
      ok: false,
      error: `Chart symbol ${args.cellConfig.symbol.toUpperCase()} does not match trade ${args.trade.symbol.toUpperCase()}.`,
    };
  }

  const clonedConfig = buildTradeChartForkCellConfig(args.cellConfig);
  const planLevels = extractPlanLevelsFromCellConfig(clonedConfig);

  let screenshotId: string | null = null;
  if (args.captureScreenshot) {
    try {
      const blob = await args.captureScreenshot();
      const screenshot = await uploadJournalTradeScreenshot(args.trade.id, blob, {
        source: "chart_capture",
        filename: "chart-capture.png",
      });
      screenshotId = screenshot?.id ?? null;
    } catch (error) {
      const reason = error instanceof Error ? ` ${error.message}` : "";
      return { ok: false, error: `Could not capture or upload chart screenshot.${reason}` };
    }
  }

  try {
    const snapshot = await createJournalTradeChartSnapshotRemote(args.trade.id, {
      cellConfig: clonedConfig,
      label: args.label ?? null,
      planLevels,
      screenshotId,
    });

    if (!snapshot) {
      return { ok: false, error: "Could not save chart snapshot to journal trade." };
    }

    return { ok: true, snapshotId: snapshot.id };
  } catch (error) {
    const reason = error instanceof Error ? ` ${error.message}` : "";
    return { ok: false, error: `Could not save chart snapshot to journal trade.${reason}` };
  }
}
