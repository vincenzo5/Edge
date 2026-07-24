import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { clearRiskPositionBindStorage } from "@/lib/risk/riskPositionBinding";
import {
  RiskPositionBindingProvider,
  useRiskPositionBinding,
} from "./RiskPositionBindingContext";

function wrapper({ children }: { children: ReactNode }) {
  return <RiskPositionBindingProvider>{children}</RiskPositionBindingProvider>;
}

describe("RiskPositionBindingContext", () => {
  beforeEach(() => {
    clearRiskPositionBindStorage();
  });
  it("binds to a drawing and tracks linked levels", () => {
    const { result } = renderHook(() => useRiskPositionBinding(), { wrapper });

    act(() => {
      result.current.bindToDrawing("cell-1", "d1");
    });
    expect(result.current.linked).toBe(true);
    expect(result.current.bind).toEqual({ cellId: "cell-1", drawingId: "d1" });

    act(() => {
      result.current.updateBoundLevels({
        direction: "long",
        side: "BUY",
        entry: 100,
        stop: 95,
        target: 110,
        riskRewardRatio: 2,
      });
    });
    expect(result.current.levels).toEqual({ direction: "long", entry: 100, stop: 95 });
  });

  it("manual override unlinks without clearing levels", () => {
    const { result } = renderHook(() => useRiskPositionBinding(), { wrapper });

    act(() => {
      result.current.bindToDrawing("cell-1", "d1");
      result.current.updateBoundLevels({
        direction: "long",
        side: "BUY",
        entry: 100,
        stop: 95,
        target: 110,
        riskRewardRatio: 2,
      });
    });

    act(() => {
      result.current.markManualOverride();
    });

    expect(result.current.linked).toBe(false);
    expect(result.current.bind).toEqual({ cellId: "cell-1", drawingId: "d1" });
    expect(result.current.levels).toEqual({ direction: "long", entry: 100, stop: 95 });
  });

  it("relink restores live sync after manual override", () => {
    const { result } = renderHook(() => useRiskPositionBinding(), { wrapper });

    act(() => {
      result.current.bindToDrawing("cell-1", "d1");
      result.current.updateBoundLevels({
        direction: "long",
        side: "BUY",
        entry: 100,
        stop: 95,
        target: 110,
        riskRewardRatio: 2,
      });
      result.current.markManualOverride();
    });

    expect(result.current.linked).toBe(false);
    expect(result.current.bind).toEqual({ cellId: "cell-1", drawingId: "d1" });

    act(() => {
      result.current.relink();
    });

    expect(result.current.linked).toBe(true);
  });

  it("relink is a no-op when no drawing is bound", () => {
    const { result } = renderHook(() => useRiskPositionBinding(), { wrapper });

    act(() => {
      result.current.relink();
    });

    expect(result.current.linked).toBe(false);
    expect(result.current.bind).toBeNull();
  });

  it("restores persisted bind after remount", () => {
    const first = renderHook(() => useRiskPositionBinding(), { wrapper });

    act(() => {
      first.result.current.bindToDrawing("cell-0", "d1");
    });

    first.unmount();

    const second = renderHook(() => useRiskPositionBinding(), { wrapper });
    expect(second.result.current.bind).toEqual({ cellId: "cell-0", drawingId: "d1" });
    expect(second.result.current.linked).toBe(true);
  });

  it("persists soft-unlinked state after remount", () => {
    const first = renderHook(() => useRiskPositionBinding(), { wrapper });

    act(() => {
      first.result.current.bindToDrawing("cell-0", "d1");
      first.result.current.markManualOverride();
    });

    first.unmount();

    const second = renderHook(() => useRiskPositionBinding(), { wrapper });
    expect(second.result.current.bind).toEqual({ cellId: "cell-0", drawingId: "d1" });
    expect(second.result.current.linked).toBe(false);
  });

  it("clears bind when bound drawing is removed", () => {
    const { result } = renderHook(() => useRiskPositionBinding(), { wrapper });

    act(() => {
      result.current.bindToDrawing("cell-1", "d1");
      result.current.updateBoundLevels({
        direction: "short",
        side: "SELL",
        entry: 50,
        stop: 55,
        target: 40,
        riskRewardRatio: 2,
      });
    });

    act(() => {
      result.current.updateBoundLevels(null);
    });

    expect(result.current.linked).toBe(false);
    expect(result.current.bind).toBeNull();
    expect(result.current.levels).toEqual({ direction: "short", entry: 50, stop: 55 });
  });
});
