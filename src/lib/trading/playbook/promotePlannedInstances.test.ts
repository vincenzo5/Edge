import { describe, expect, it, vi } from "vitest";

import { applyRiskPolicy } from "@/lib/risk/policy/applyRiskPolicy";
import type { RiskPolicyTemplate } from "@/lib/risk/policy/types";
import { createMemoryPlaybookInstanceStore } from "@/lib/trading/playbookInstanceStore";
import { lockPositionPlan } from "@/lib/trading/playbook/types";

import {
  buildEntryDraftFromPlannedInstance,
  materializePlannedSchedules,
  promoteDuePlannedInstances,
} from "./promotePlannedInstances";

const template: RiskPolicyTemplate = {
  id: "tpl-schedule",
  name: "Scheduled",
  schemaVersion: 1,
  scope: "trade",
  exits: [
    {
      id: "be",
      when: { kind: "multipleOfR", multiple: 1 },
      then: { kind: "modifyStop", breakEven: true },
      once: true,
    },
  ],
  adds: [],
};

describe("promotePlannedInstances", () => {
  it("builds limit entry draft from planned instance", async () => {
    const plan = lockPositionPlan({
      symbol: "AAPL",
      accountId: "DUP586813",
      side: "BUY",
      entry: 100,
      initialStop: 95,
      qty: 10,
      environment: "paper",
    });
    const store = createMemoryPlaybookInstanceStore();
    const applied = await applyRiskPolicy(store, {
      template,
      positionPlan: plan,
      bindingRef: { kind: "drawing", id: "draw-1" },
      entrySchedule: { kind: "clock", at: "2026-07-31T13:35:00.000Z", timeZone: "America/New_York" },
      scheduledFor: "2026-07-31T13:35:00.000Z",
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;

    const draft = buildEntryDraftFromPlannedInstance(applied.playbookInstance);
    expect(draft.orderType).toBe("LMT");
    expect(draft.limitPrice).toBe(100);
    expect(draft.quantity).toBe(10);
  });

  it("promotes due planned instances to pending_fill", async () => {
    const store = createMemoryPlaybookInstanceStore();
    const plan = lockPositionPlan({
      symbol: "AAPL",
      accountId: "DUP586813",
      side: "BUY",
      entry: 100,
      initialStop: 95,
      qty: 10,
      environment: "paper",
    });
    await applyRiskPolicy(store, {
      template,
      positionPlan: plan,
      bindingRef: { kind: "drawing", id: "draw-2" },
      scheduledFor: "2026-07-31T13:00:00.000Z",
      entrySchedule: { kind: "clock", at: "2026-07-31T13:00:00.000Z", timeZone: "America/New_York" },
    });

    const submitOrder = vi.fn(async () => ({
      orderRef: "edge-policy-ref",
      intent: { intentId: "intent-1" },
    }));

    const result = await promoteDuePlannedInstances({
      playbookStore: store,
      tradingService: { submitOrder },
      environments: ["paper"],
      now: new Date("2026-07-31T14:00:00.000Z"),
    });

    expect(result.promoted).toBe(1);
    expect(submitOrder).toHaveBeenCalledTimes(1);
    const due = await store.listDuePlanned({
      environment: "paper",
      now: new Date("2026-07-31T14:00:00.000Z"),
    });
    expect(due).toHaveLength(0);
  });

  it("materializes scheduledFor from entrySchedule", async () => {
    const store = createMemoryPlaybookInstanceStore();
    const plan = lockPositionPlan({
      symbol: "MSFT",
      accountId: "DUP586813",
      side: "BUY",
      entry: 200,
      initialStop: 190,
      qty: 5,
      environment: "paper",
    });
    await applyRiskPolicy(store, {
      template,
      positionPlan: plan,
      bindingRef: { kind: "drawing", id: "draw-3" },
      entrySchedule: { kind: "clock", at: "2026-08-01T13:35:00.000Z", timeZone: "America/New_York" },
    });

    const updated = await materializePlannedSchedules({
      playbookStore: store,
      now: new Date("2026-07-31T12:00:00.000Z"),
    });
    expect(updated).toBe(1);
    const planned = await store.listPlanned({ environment: "paper" });
    expect(planned[0]?.scheduledFor).toBe("2026-08-01T13:35:00.000Z");
  });
});
