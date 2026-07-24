import type { SerializedDrawing } from "@edge/chart-core/contracts";
import { LIVE_CONFIRMATION_TOKEN } from "@/lib/trading/validateOrder";
import {
  isPositionDrawingName,
  positionOrderLevelsFromDrawing,
} from "@/lib/trading/positionTradeSetup";
import { modifyOrder, TradingApiError } from "@/lib/trading/tradingClient";
import type { PlaybookInstance } from "@/lib/trading/playbook/types";
import type { TradingEnvironment } from "@/lib/trading/types";

export function positionStopFingerprint(drawing: SerializedDrawing): string {
  const levels = positionOrderLevelsFromDrawing(drawing);
  if (!levels) return "";
  return String(levels.stop);
}

function resolveLiveConfirmation(environment: TradingEnvironment): string | undefined {
  if (environment !== "live") return undefined;
  const entered = window.prompt(
    `Modify live protective stop — type ${LIVE_CONFIRMATION_TOKEN} to confirm`,
  );
  if (entered?.trim() !== LIVE_CONFIRMATION_TOKEN) {
    throw new TradingApiError(`Live stop modify requires typing ${LIVE_CONFIRMATION_TOKEN}`, 400);
  }
  return LIVE_CONFIRMATION_TOKEN;
}

function findMatchingInstance(args: {
  instances: PlaybookInstance[];
  symbol: string;
  accountId: string;
  environment: TradingEnvironment;
}): PlaybookInstance | null {
  const normalized = args.symbol.trim().toUpperCase();
  return (
    args.instances.find(
      (item) =>
        item.positionPlan.symbol === normalized &&
        item.positionPlan.accountId === args.accountId &&
        item.positionPlan.environment === args.environment &&
        (item.status === "armed" || item.status === "paused" || item.status === "pending_fill"),
    ) ?? null
  );
}

export async function syncPlaybookStopOnDrawingChange(args: {
  previousDrawings: SerializedDrawing[];
  nextDrawings: SerializedDrawing[];
  symbol: string;
  accountId: string;
  environment: TradingEnvironment;
  instances: PlaybookInstance[];
}): Promise<void> {
  if (!args.accountId.trim()) return;

  const previousById = new Map(
    args.previousDrawings.filter((drawing) => drawing.id).map((drawing) => [drawing.id!, drawing]),
  );

  for (const next of args.nextDrawings) {
    if (!next.id || !isPositionDrawingName(next.name)) continue;
    const previous = previousById.get(next.id);
    if (previous && positionStopFingerprint(previous) === positionStopFingerprint(next)) {
      continue;
    }

    const levels = positionOrderLevelsFromDrawing(next);
    if (!levels || !Number.isFinite(levels.stop) || levels.stop <= 0) continue;

    const instance = findMatchingInstance(args);
    if (!instance?.stopOrderId) continue;

    const liveConfirmation = resolveLiveConfirmation(args.environment);
    try {
      await modifyOrder(
        instance.stopOrderId,
        args.accountId,
        { stopPrice: levels.stop },
        {
          environment: args.environment,
          liveConfirmation,
        },
      );
    } catch (error) {
      if (error instanceof TradingApiError) {
        console.warn("[playbookStopSync]", error.message);
      } else {
        console.warn("[playbookStopSync]", error);
      }
    }
  }
}
