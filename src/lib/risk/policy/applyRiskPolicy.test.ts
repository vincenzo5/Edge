import { describe, expect, it } from "vitest";

import { lockPositionPlan } from "@/lib/trading/playbook/types";
import { BREAK_EVEN_PRESET } from "@/lib/trading/playbook/presets";
import {
  createMemoryPlaybookInstanceStore,
  createPlaybookInstanceId,
} from "@/lib/trading/playbookInstanceStore";
import { createPlaybookInstance } from "@/lib/trading/playbook/types";

import { applyRiskPolicy, buildPlannedRiskPolicyInstance } from "./applyRiskPolicy";
import { presetToRiskPolicyTemplate } from "./completeness";

describe("applyRiskPolicy", () => {
  const positionPlan = lockPositionPlan({
    symbol: "AAPL",
    accountId: "DUP586813",
    side: "BUY",
    entry: 100,
    initialStop: 95,
    qty: 10,
    environment: "paper",
    lockedAt: "2026-07-31T12:00:00.000Z",
  });

  const template = presetToRiskPolicyTemplate(BREAK_EVEN_PRESET.id);
  const bindingRef = { kind: "drawing" as const, id: "draw-1" };

  it("creates a planned instance on apply", async () => {
    const store = createMemoryPlaybookInstanceStore();
    const result = await applyRiskPolicy(store, {
      template,
      positionPlan,
      bindingRef,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.instance.status).toBe("planned");
    expect(result.instance.bindingRef).toEqual(bindingRef);
    expect(result.playbookInstance.policySnapshot?.id).toBe(template.id);
    expect(result.playbookInstance.controlMode).toBe("automated");
  });

  it("rejects when planned binding already exists", async () => {
    const store = createMemoryPlaybookInstanceStore();
    const first = await applyRiskPolicy(store, {
      template,
      positionPlan,
      bindingRef,
    });
    expect(first.ok).toBe(true);

    const second = await applyRiskPolicy(store, {
      template,
      positionPlan,
      bindingRef,
      onConflict: "reject",
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.conflict?.status).toBe("planned");
  });

  it("swaps planned incumbent on binding conflict", async () => {
    const store = createMemoryPlaybookInstanceStore();
    const firstId = createPlaybookInstanceId();
    await applyRiskPolicy(store, {
      id: firstId,
      template,
      positionPlan,
      bindingRef,
    });

    const secondId = createPlaybookInstanceId();
    const swapped = await applyRiskPolicy(store, {
      id: secondId,
      template,
      positionPlan,
      bindingRef,
      onConflict: "swap",
    });
    expect(swapped.ok).toBe(true);

    const first = await store.getById(firstId);
    expect(first?.status).toBe("superseded");
    expect(first?.offReason).toBe("swapped");

    const second = await store.getById(secondId);
    expect(second?.status).toBe("planned");
  });

  it("rejects when active trade key already exists", async () => {
    const store = createMemoryPlaybookInstanceStore();
    await store.create(
      createPlaybookInstance({
        id: createPlaybookInstanceId(),
        template: BREAK_EVEN_PRESET,
        positionPlan,
        status: "armed",
      }),
    );

    const result = await applyRiskPolicy(store, {
      template,
      positionPlan,
      bindingRef: { kind: "drawing", id: "draw-2" },
      onConflict: "reject",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.conflict?.status).toBe("armed");
  });

  it("buildPlannedRiskPolicyInstance defaults entry schedule and order", () => {
    const instance = buildPlannedRiskPolicyInstance({
      template,
      positionPlan,
      bindingRef,
    });
    expect(instance.entrySchedule).toEqual({ kind: "immediate" });
    expect(instance.entryOrder.orderType).toBe("LMT");
    expect(instance.entryOrder.limitPrice).toBe(100);
  });
});
