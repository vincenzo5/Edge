import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTradePolicyApply } from "./useTradePolicyApply";
import { HALF_THEN_BE_PRESET } from "@/lib/trading/playbook/presets";

const mockApplyRiskPolicyToBinding = vi.fn();
const mockClearPlannedPolicyBinding = vi.fn();

vi.mock("@/lib/trading/tradingClient", () => ({
  applyRiskPolicyToBinding: (...args: unknown[]) => mockApplyRiskPolicyToBinding(...args),
  clearPlannedPolicyBinding: (...args: unknown[]) => mockClearPlannedPolicyBinding(...args),
}));

const userLongTemplate = {
  ...HALF_THEN_BE_PRESET,
  id: "user_long",
  name: "Long half → BE → 0.5R trail",
  geometry: {
    stops: [{ rMultiple: 1 }],
    targets: [{ rMultiple: 1 }],
  },
};

const planLevels = {
  direction: "long" as const,
  side: "BUY" as const,
  entry: 100,
  stop: 95,
  target: 105,
  riskRewardRatio: 1,
};

describe("useTradePolicyApply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApplyRiskPolicyToBinding.mockResolvedValue({});
    mockClearPlannedPolicyBinding.mockResolvedValue(true);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          presets: [],
          userTemplates: [userLongTemplate],
        }),
      }),
    );
  });

  it("applies draft patch when unbound without calling persist API", async () => {
    const onDraftApplied = vi.fn();
    const { result } = renderHook(() =>
      useTradePolicyApply({
        bind: null,
        planLevels: null,
        symbol: "META",
        accountId: "ACC1",
        environment: "paper",
        entryQty: 200,
        side: "BUY",
        entryPrice: 100,
        dollarRisk: 1000,
        instances: [],
        onDraftApplied,
      }),
    );

    await waitFor(() => expect(result.current.templates.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.applyPolicy("user_long");
    });

    expect(mockApplyRiskPolicyToBinding).not.toHaveBeenCalled();
    expect(onDraftApplied).toHaveBeenCalledWith(
      expect.objectContaining({
        takeProfitQuantity: 100,
        stopQuantity: 200,
        manageTemplateId: "user_long",
      }),
    );
    expect(result.current.selectedTemplateId).toBe("user_long");
  });

  it("persists to drawing binding when bound", async () => {
    const { result } = renderHook(() =>
      useTradePolicyApply({
        bind: { drawingId: "draw-1" },
        planLevels,
        symbol: "META",
        accountId: "ACC1",
        environment: "paper",
        entryQty: 200,
        side: "BUY",
        instances: [],
      }),
    );

    await waitFor(() => expect(result.current.templates.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.applyPolicy("user_long");
    });

    expect(mockApplyRiskPolicyToBinding).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: "user_long",
        bindingRef: { kind: "drawing", id: "draw-1" },
      }),
    );
  });
});
