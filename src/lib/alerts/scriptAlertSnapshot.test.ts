import { describe, expect, it } from "vitest";

import {
  extractScriptConditionSnapshot,
  resetScriptAlertSnapshotCacheForTests,
} from "./scriptAlertSnapshot";

describe("scriptAlertSnapshot", () => {
  it("extracts last-bar truthiness from declared series", () => {
    resetScriptAlertSnapshotCacheForTests();
    const snapshot = extractScriptConditionSnapshot({
      manifest: {
        name: "Test",
        pane: "sub",
        inputs: {},
        plots: {},
        alerts: {
          crossUp: { title: "Cross up", seriesId: "crossUp" },
        },
      },
      conditionId: "crossUp",
      series: {
        crossUp: [0, 0, 1],
      },
      candles: [
        { t: 1, o: 1, h: 1, l: 1, c: 1, v: 1 },
        { t: 2, o: 1, h: 1, l: 1, c: 1, v: 1 },
        { t: 3, o: 1, h: 1, l: 1, c: 1, v: 1 },
      ],
    });
    expect(snapshot).toEqual({ satisfied: true, barTime: 3 });
  });
});
