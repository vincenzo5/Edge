import { describe, expect, it } from "vitest";

import { createPlaybookInstance, lockPositionPlan } from "./playbook/types";
import { BREAK_EVEN_PRESET } from "./playbook/presets";
import { instanceStatusAfterDetach } from "./playbook/conflictPolicy";
import {
  createMemoryPlaybookInstanceStore,
  createPlaybookInstanceId,
} from "./playbookInstanceStore";

describe("playbookInstanceStore", () => {
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

  const template = BREAK_EVEN_PRESET;

  it("creates and lists active instances by account", async () => {
    const store = createMemoryPlaybookInstanceStore();
    const instance = createPlaybookInstance({
      id: createPlaybookInstanceId(),
      template,
      positionPlan,
      status: "pending_fill",
      orderIntentId: "intent-1",
      orderRef: "edge-intent-intent-1",
      createdAt: "2026-07-24T12:00:00.000Z",
    });

    await store.create(instance);

    const listed = await store.listByAccount("DUP586813", { activeOnly: true });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(instance.id);
  });

  it("detaches without removing instance from store", async () => {
    const store = createMemoryPlaybookInstanceStore();
    const instance = createPlaybookInstance({
      id: createPlaybookInstanceId(),
      template,
      positionPlan,
      status: "armed",
      createdAt: "2026-07-24T12:00:00.000Z",
    });
    await store.create(instance);

    const detached = await store.updateStatus(instance.id, instanceStatusAfterDetach());
    expect(detached?.status).toBe("detached");

    const active = await store.listByAccount("DUP586813", { activeOnly: true });
    expect(active).toHaveLength(0);
  });

  it("finds instance by order intent id", async () => {
    const store = createMemoryPlaybookInstanceStore();
    const instance = createPlaybookInstance({
      id: createPlaybookInstanceId(),
      template,
      positionPlan,
      orderIntentId: "abc-intent",
      createdAt: "2026-07-24T12:00:00.000Z",
    });
    await store.create(instance);

    const found = await store.getByOrderIntentId("abc-intent");
    expect(found?.id).toBe(instance.id);
  });

  it("patches rule runtimes and runtime fields", async () => {
    const store = createMemoryPlaybookInstanceStore();
    const instance = createPlaybookInstance({
      id: createPlaybookInstanceId(),
      template,
      positionPlan,
      status: "armed",
      createdAt: "2026-07-24T12:00:00.000Z",
    });
    await store.create(instance);

    const patched = await store.patch(instance.id, {
      stopOrderId: 99,
      filledQty: 50,
      ruleRuntimes: instance.ruleRuntimes.map((item) =>
        item.ruleId === "be-at-1r"
          ? { ...item, status: "fired", firedAt: "2026-07-24T12:05:00.000Z" }
          : item,
      ),
    });

    expect(patched?.stopOrderId).toBe(99);
    expect(patched?.filledQty).toBe(50);
    expect(patched?.ruleRuntimes[0]?.status).toBe("fired");
  });

  it("lists active instances for cron evaluation", async () => {
    const store = createMemoryPlaybookInstanceStore();
    await store.create(
      createPlaybookInstance({
        id: createPlaybookInstanceId(),
        template,
        positionPlan,
        status: "armed",
      }),
    );
    await store.create(
      createPlaybookInstance({
        id: createPlaybookInstanceId(),
        template,
        positionPlan: { ...positionPlan, environment: "live" },
        status: "armed",
      }),
    );

    const paperActive = await store.listActive({ environment: "paper" });
    expect(paperActive).toHaveLength(1);
  });
});
