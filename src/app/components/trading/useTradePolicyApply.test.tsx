import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTradePolicyApply } from "./useTradePolicyApply";
import { HALF_THEN_BE_PRESET } from "@/lib/trading/playbook/presets";
import { DEFAULT_RISK_SETTINGS } from "@/lib/risk/riskSettings";
import { writeDefaultPolicyBySide } from "@/lib/risk/policy/defaultPolicyPreference";

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

const userShortTemplate = {
  ...HALF_THEN_BE_PRESET,
  id: "user_short",
  name: "Short half → BE → 0.5R trail",
  geometry: {
    stops: [{ rMultiple: 1 }],
    targets: [{ rMultiple: 1 }],
  },
};

const baseHookArgs = {
  bind: null as const,
  planLevels: null,
  symbol: "META",
  accountId: "ACC1",
  environment: "paper" as const,
  entryQty: 200,
  side: "BUY" as const,
  entryPrice: 100,
  dollarRisk: 1000,
  sessionSettings: DEFAULT_RISK_SETTINGS,
  accountBasisValue: 100_000,
  instances: [] as const,
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
    localStorage.clear();
    mockApplyRiskPolicyToBinding.mockResolvedValue({});
    mockClearPlannedPolicyBinding.mockResolvedValue(true);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          presets: [],
          userTemplates: [userLongTemplate, userShortTemplate],
        }),
      }),
    );
  });

  it("ignores undefined holes when filtering user templates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          presets: [undefined, null],
          userTemplates: [undefined, userLongTemplate, null],
        }),
      }),
    );

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
        sessionSettings: DEFAULT_RISK_SETTINGS,
        accountBasisValue: 100_000,
        instances: [],
      }),
    );

    await waitFor(() => expect(result.current.templates).toEqual([userLongTemplate]));
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
        sessionSettings: DEFAULT_RISK_SETTINGS,
        accountBasisValue: 100_000,
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

  it("seeds draft from default policy when unbound", async () => {
    writeDefaultPolicyBySide({ long: "user_long" });
    const onDraftApplied = vi.fn();
    const { result } = renderHook(() =>
      useTradePolicyApply({
        ...baseHookArgs,
        onDraftApplied,
      }),
    );

    await waitFor(() => expect(result.current.selectedTemplateId).toBe("user_long"));
    expect(onDraftApplied).toHaveBeenCalledWith(
      expect.objectContaining({ manageTemplateId: "user_long" }),
    );
    expect(mockApplyRiskPolicyToBinding).not.toHaveBeenCalled();
  });

  it("planned instance wins over default policy seed", async () => {
    writeDefaultPolicyBySide({ long: "user_long" });
    const { result } = renderHook(() =>
      useTradePolicyApply({
        ...baseHookArgs,
        bind: { drawingId: "draw-1" },
        planLevels,
        instances: [
          {
            id: "inst-1",
            templateId: "user_short",
            status: "planned",
            bindingRef: { kind: "drawing", id: "draw-1" },
            accountId: "ACC1",
            symbol: "META",
            environment: "paper",
            positionPlan: null,
            createdAt: "",
            updatedAt: "",
          },
        ],
      }),
    );

    await waitFor(() => expect(result.current.templates.length).toBeGreaterThan(0));
    expect(result.current.selectedTemplateId).toBe("user_short");
  });

  it("manual clear stays cleared until side changes", async () => {
    writeDefaultPolicyBySide({ long: "user_long" });
    const { result } = renderHook(() =>
      useTradePolicyApply({
        ...baseHookArgs,
      }),
    );

    await waitFor(() => expect(result.current.selectedTemplateId).toBe("user_long"));

    await act(async () => {
      await result.current.applyPolicy(null);
    });

    expect(result.current.selectedTemplateId).toBeNull();
    await waitFor(() => expect(result.current.selectedTemplateId).toBeNull(), { timeout: 500 });
  });

  it("side change re-seeds from that side default", async () => {
    writeDefaultPolicyBySide({ long: "user_long", short: "user_short" });
    const { result, rerender } = renderHook(
      (props: typeof baseHookArgs) => useTradePolicyApply(props),
      { initialProps: baseHookArgs },
    );

    await waitFor(() => expect(result.current.selectedTemplateId).toBe("user_long"));

    rerender({ ...baseHookArgs, side: "SELL" });

    await waitFor(() => expect(result.current.selectedTemplateId).toBe("user_short"));
  });

  it("ignores missing default template id", async () => {
    writeDefaultPolicyBySide({ long: "user_missing" });
    const { result } = renderHook(() =>
      useTradePolicyApply({
        ...baseHookArgs,
      }),
    );

    await waitFor(() => expect(result.current.templates.length).toBeGreaterThan(0));
    expect(result.current.selectedTemplateId).toBeNull();
  });

  it("persists to drawing binding when bound", async () => {
    const onDrawingLevelsReshaped = vi.fn();
    const { result } = renderHook(() =>
      useTradePolicyApply({
        bind: { drawingId: "draw-1" },
        planLevels: { ...planLevels, target: 110, riskRewardRatio: 2 },
        symbol: "META",
        accountId: "ACC1",
        environment: "paper",
        entryQty: 200,
        side: "BUY",
        sessionSettings: DEFAULT_RISK_SETTINGS,
        accountBasisValue: 100_000,
        instances: [],
        onDrawingLevelsReshaped,
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
    expect(onDrawingLevelsReshaped).toHaveBeenCalledWith({
      entry: 100,
      stop: 95,
      target: 105,
    });
  });
});
