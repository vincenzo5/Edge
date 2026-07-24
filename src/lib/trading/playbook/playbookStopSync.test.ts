import { describe, expect, it, vi, beforeEach } from "vitest";

import { BREAK_EVEN_PRESET } from "./presets";
import { createPlaybookInstance, lockPositionPlan } from "./types";
import { modifyOrder } from "@/lib/trading/tradingClient";
import { syncPlaybookStopOnDrawingChange } from "./playbookStopSync";

vi.mock("@/lib/trading/tradingClient", () => ({
  modifyOrder: vi.fn(async () => ({ order: { orderId: 20 }, intent: null })),
  TradingApiError: class TradingApiError extends Error {
    status = 400;
  },
}));

describe("syncPlaybookStopOnDrawingChange", () => {
  const positionPlan = lockPositionPlan({
    symbol: "AAPL",
    accountId: "DUP586813",
    side: "BUY",
    entry: 100,
    initialStop: 95,
    qty: 10,
    environment: "paper",
    lockedAt: "2026-07-24T12:00:00.000Z",
  });

  const instance = {
    ...createPlaybookInstance({
      id: "inst-stop",
      template: BREAK_EVEN_PRESET,
      positionPlan,
      status: "armed",
      createdAt: "2026-07-24T12:00:00.000Z",
    }),
    stopOrderId: 20,
  };

  const longDrawing = {
    id: "d1",
    name: "long_position",
    label: "Long",
    points: [
      { timestamp: 1000, value: 100 },
      { timestamp: 1000, value: 95 },
      { timestamp: 2000, value: 110 },
      { timestamp: 2000, value: 100 },
    ],
  };

  beforeEach(() => {
    vi.mocked(modifyOrder).mockClear();
  });

  it("modifies broker stop when position drawing stop changes", async () => {
    const nextDrawing = {
      ...longDrawing,
      points: [
        { timestamp: 1000, value: 100 },
        { timestamp: 1000, value: 94 },
        { timestamp: 2000, value: 110 },
        { timestamp: 2000, value: 100 },
      ],
    };

    await syncPlaybookStopOnDrawingChange({
      previousDrawings: [longDrawing],
      nextDrawings: [nextDrawing],
      symbol: "AAPL",
      accountId: "DUP586813",
      environment: "paper",
      instances: [instance],
    });

    expect(modifyOrder).toHaveBeenCalledWith(
      20,
      "DUP586813",
      { stopPrice: 94 },
      { environment: "paper", liveConfirmation: undefined },
    );
  });

  it("skips when stop fingerprint is unchanged", async () => {
    await syncPlaybookStopOnDrawingChange({
      previousDrawings: [longDrawing],
      nextDrawings: [longDrawing],
      symbol: "AAPL",
      accountId: "DUP586813",
      environment: "paper",
      instances: [instance],
    });

    expect(modifyOrder).not.toHaveBeenCalled();
  });
});
