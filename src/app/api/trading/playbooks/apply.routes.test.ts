import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as applyPolicy, DELETE as clearPlanned } from "@/app/api/trading/playbooks/apply/route";
import {
  PATCH as syncPlanned,
  POST as promotePlanned,
} from "@/app/api/trading/playbooks/[id]/planned/route";

const mockApplyRiskPolicyToBinding = vi.fn();
const mockClearPlannedBinding = vi.fn();
const mockSyncPlannedInstance = vi.fn();
const mockPromotePlannedInstance = vi.fn();
const mockArmPlannedSchedule = vi.fn();

vi.mock("@/lib/trading/tradingService", () => ({
  isTradingConfigured: vi.fn(() => true),
  getTradingService: vi.fn(() => ({
    applyRiskPolicyToBinding: mockApplyRiskPolicyToBinding,
    clearPlannedBinding: mockClearPlannedBinding,
    syncPlannedInstance: mockSyncPlannedInstance,
    promotePlannedInstance: mockPromotePlannedInstance,
    armPlannedSchedule: mockArmPlannedSchedule,
  })),
}));

describe("/api/trading/playbooks apply routes", () => {
  beforeEach(() => {
    mockApplyRiskPolicyToBinding.mockReset();
    mockClearPlannedBinding.mockReset();
    mockSyncPlannedInstance.mockReset();
    mockPromotePlannedInstance.mockReset();
    mockArmPlannedSchedule.mockReset();
  });

  it("POST /apply creates planned instance", async () => {
    mockApplyRiskPolicyToBinding.mockResolvedValue({ id: "inst-1", status: "planned" });
    const res = await applyPolicy(
      new NextRequest("http://localhost/api/trading/playbooks/apply", {
        method: "POST",
        body: JSON.stringify({
          templateId: "classic_protect",
          bindingRef: { kind: "drawing", id: "draw-1" },
          positionPlan: {
            symbol: "AAPL",
            accountId: "DUP586813",
            side: "BUY",
            entry: 100,
            initialStop: 95,
            qty: 10,
            rUnit: 5,
            environment: "paper",
            lockedAt: "2026-07-31T12:00:00.000Z",
          },
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(mockApplyRiskPolicyToBinding).toHaveBeenCalledTimes(1);
  });

  it("DELETE /apply clears planned binding", async () => {
    mockClearPlannedBinding.mockResolvedValue(true);
    const res = await clearPlanned(
      new NextRequest("http://localhost/api/trading/playbooks/apply", {
        method: "DELETE",
        body: JSON.stringify({ bindingRef: { kind: "drawing", id: "draw-1" } }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cleared).toBe(true);
  });

  it("PATCH /planned syncs levels", async () => {
    mockSyncPlannedInstance.mockResolvedValue({ id: "inst-1", status: "planned" });
    const res = await syncPlanned(
      new NextRequest("http://localhost/api/trading/playbooks/inst-1/planned", {
        method: "PATCH",
        body: JSON.stringify({
          entryOrder: { type: "LMT", limitPrice: 101 },
        }),
      }),
      { params: Promise.resolve({ id: "inst-1" }) },
    );
    expect(res.status).toBe(200);
    expect(mockSyncPlannedInstance).toHaveBeenCalledWith("inst-1", {
      entryOrder: { type: "LMT", limitPrice: 101 },
    });
  });

  it("POST /planned promotes instance", async () => {
    mockPromotePlannedInstance.mockResolvedValue({ id: "inst-1", status: "pending_fill" });
    const res = await promotePlanned(
      new NextRequest("http://localhost/api/trading/playbooks/inst-1/planned", {
        method: "POST",
        body: JSON.stringify({ idempotencyKey: "key-1" }),
      }),
      { params: Promise.resolve({ id: "inst-1" }) },
    );
    expect(res.status).toBe(200);
    expect(mockPromotePlannedInstance).toHaveBeenCalled();
  });
});
