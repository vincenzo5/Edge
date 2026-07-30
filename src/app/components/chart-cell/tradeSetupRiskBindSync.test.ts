import { describe, expect, it, vi } from "vitest";
import type { useRiskPositionBindingOptional } from "../risk/RiskPositionBindingContext";
import type { useTradeSetupBindingOptional } from "../trading/TradeSetupBindingContext";

/** Mirrors the Trade setup… handler in useChartCellContextMenus. */
function runTradeSetupHandoff(args: {
  chartId: string;
  overlayId: string;
  symbol: string;
  tradeBinding: NonNullable<ReturnType<typeof useTradeSetupBindingOptional>>;
  riskBinding: ReturnType<typeof useRiskPositionBindingOptional>;
}) {
  args.riskBinding?.bindToDrawing(args.chartId, args.overlayId);
  args.tradeBinding.openTradeFromDrawing(args.chartId, args.overlayId, args.symbol);
}

describe("Trade setup Risk geometry sync", () => {
  it("binds Risk panel before opening Trade from drawing", () => {
    const bindToDrawing = vi.fn();
    const openTradeFromDrawing = vi.fn();
    runTradeSetupHandoff({
      chartId: "cell-1",
      overlayId: "draw-9",
      symbol: "AAPL",
      riskBinding: { bindToDrawing } as unknown as NonNullable<
        ReturnType<typeof useRiskPositionBindingOptional>
      >,
      tradeBinding: { openTradeFromDrawing } as unknown as NonNullable<
        ReturnType<typeof useTradeSetupBindingOptional>
      >,
    });
    expect(bindToDrawing).toHaveBeenCalledWith("cell-1", "draw-9");
    expect(openTradeFromDrawing).toHaveBeenCalledWith("cell-1", "draw-9", "AAPL");
    expect(bindToDrawing.mock.invocationCallOrder[0]).toBeLessThan(
      openTradeFromDrawing.mock.invocationCallOrder[0]!,
    );
  });
});
