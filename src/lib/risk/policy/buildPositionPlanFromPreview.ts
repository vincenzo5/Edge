import type { PositionRiskPreview } from "@/lib/risk/computePositionRiskPreview";
import { lockPositionPlan, type PositionPlan } from "@/lib/trading/playbook/types";
import type { TradingEnvironment } from "@/lib/trading/types";

export function buildPositionPlanFromPreview(args: {
  preview: PositionRiskPreview;
  symbol: string;
  accountId: string;
  environment: TradingEnvironment;
  qty?: number;
}): PositionPlan {
  const qty =
    args.qty ??
    args.preview.sizing?.shares ??
    (() => {
      throw new Error("Cannot build position plan without qty or sizing");
    })();

  return lockPositionPlan({
    symbol: args.symbol.trim().toUpperCase(),
    accountId: args.accountId.trim(),
    side: args.preview.side,
    entry: args.preview.entry,
    initialStop: args.preview.stop,
    qty: Math.max(1, Math.round(qty)),
    environment: args.environment,
  });
}
