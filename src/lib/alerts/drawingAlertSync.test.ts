import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SerializedDrawing } from "@/lib/chart/contracts";
import { clearLocalAlertsForTests, createLocalAlert } from "@/lib/alerts/localAlertStore";
import { syncAlertsWithDrawingChanges } from "@/lib/alerts/drawingAlertSync";

vi.mock("@/lib/alerts/alertClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/alerts/alertClient")>();
  return {
    ...actual,
    fetchAlerts: vi.fn(async () => {
      const { listLocalAlerts } = await import("@/lib/alerts/localAlertStore");
      return listLocalAlerts();
    }),
    patchAlertsByDrawingId: vi.fn(async (drawingId, patch) => {
      const { listLocalAlerts, updateLocalAlert } = await import("@/lib/alerts/localAlertStore");
      const alerts = listLocalAlerts().filter((alert) => alert.drawingId === drawingId);
      for (const alert of alerts) {
        updateLocalAlert(alert.id, patch);
      }
    }),
    patchAlert: vi.fn(async (alertId, patch) => {
      const { updateLocalAlert } = await import("@/lib/alerts/localAlertStore");
      return updateLocalAlert(alertId, patch);
    }),
    expireAlertsForDrawingId: vi.fn(async (drawingId) => {
      const { listLocalAlerts, updateLocalAlert } = await import("@/lib/alerts/localAlertStore");
      const alerts = listLocalAlerts().filter((alert) => alert.drawingId === drawingId);
      for (const alert of alerts) {
        updateLocalAlert(alert.id, { status: "expired" });
      }
    }),
  };
});

const baseDrawing = (input: Partial<SerializedDrawing> & Pick<SerializedDrawing, "id" | "name">): SerializedDrawing => ({
  label: input.label ?? "Drawing",
  points: input.points ?? [{ value: 100 }],
  visible: true,
  locked: false,
  zLevel: 0,
  ...input,
});

describe("syncAlertsWithDrawingChanges", () => {
  beforeEach(() => {
    clearLocalAlertsForTests();
  });

  it("expires alerts when a bound drawing is deleted", async () => {
    createLocalAlert({
      symbol: "SPY",
      operator: "cross_above",
      price: 100,
      drawingId: "d1",
      drawingKind: "horizontal_line",
    });

    const previous = [
      baseDrawing({ id: "d1", name: "horizontal_line", points: [{ value: 100 }] }),
    ];
    await syncAlertsWithDrawingChanges(previous, []);

    const { listLocalAlerts } = await import("@/lib/alerts/localAlertStore");
    expect(listLocalAlerts()[0]?.status).toBe("expired");
  });

  it("patches geometry when a bound drawing moves", async () => {
    createLocalAlert({
      symbol: "SPY",
      operator: "cross_above",
      price: 100,
      drawingId: "d1",
      drawingKind: "horizontal_line",
    });

    const previous = [
      baseDrawing({ id: "d1", name: "horizontal_line", points: [{ value: 100 }] }),
    ];
    const next = [
      baseDrawing({ id: "d1", name: "horizontal_line", points: [{ value: 105 }] }),
    ];
    await syncAlertsWithDrawingChanges(previous, next);

    const { listLocalAlerts } = await import("@/lib/alerts/localAlertStore");
    expect(listLocalAlerts()[0]?.price).toBe(105);
  });

  it("patches trade plan alerts by role when position drawing moves", async () => {
    createLocalAlert({
      symbol: "AAPL",
      operator: "cross_above",
      price: 100,
      drawingId: "pos-1",
      drawingRole: "entry",
      bundleId: "bundle-1",
    });
    createLocalAlert({
      symbol: "AAPL",
      operator: "cross_below",
      price: 95,
      drawingId: "pos-1",
      drawingRole: "stop",
      bundleId: "bundle-1",
    });

    const previous = [
      baseDrawing({
        id: "pos-1",
        name: "long_position",
        points: [
          { value: 100 },
          { value: 95 },
          { value: 110 },
          { timestamp: 1, value: 100 },
        ],
      }),
    ];
    const next = [
      baseDrawing({
        id: "pos-1",
        name: "long_position",
        points: [
          { value: 101 },
          { value: 94 },
          { value: 111 },
          { timestamp: 1, value: 101 },
        ],
      }),
    ];

    await syncAlertsWithDrawingChanges(previous, next);

    const { listLocalAlerts } = await import("@/lib/alerts/localAlertStore");
    const entry = listLocalAlerts().find((alert) => alert.drawingRole === "entry");
    const stop = listLocalAlerts().find((alert) => alert.drawingRole === "stop");
    expect(entry?.price).toBe(101);
    expect(stop?.price).toBe(94);
  });

  it("expires trade plan alerts when position drawing is deleted", async () => {
    createLocalAlert({
      symbol: "AAPL",
      operator: "cross_above",
      price: 100,
      drawingId: "pos-1",
      drawingRole: "entry",
    });

    const previous = [
      baseDrawing({
        id: "pos-1",
        name: "long_position",
        points: [{ value: 100 }, { value: 95 }, { value: 110 }, { timestamp: 1, value: 100 }],
      }),
    ];
    await syncAlertsWithDrawingChanges(previous, []);

    const { listLocalAlerts } = await import("@/lib/alerts/localAlertStore");
    expect(listLocalAlerts()[0]?.status).toBe("expired");
  });
});
