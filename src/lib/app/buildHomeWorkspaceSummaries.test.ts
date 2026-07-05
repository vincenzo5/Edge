import { describe, expect, it, beforeEach } from "vitest";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import {
  buildActiveWorkspaceSummary,
  buildHomeWorkspaceSummaries,
} from "./buildHomeWorkspaceSummaries";
import {
  createDefaultWorkspaceTabs,
  createTab,
  resetWorkspaceTabIdCounterForTests,
} from "./workspaceTabs";

describe("buildHomeWorkspaceSummaries", () => {
  beforeEach(() => {
    resetWorkspaceTabIdCounterForTests();
  });

  it("builds active workspace summary from default tabs", () => {
    const state = createDefaultWorkspaceTabs();
    const summary = buildActiveWorkspaceSummary(state);

    expect(summary.title).toBe("Default");
    expect(summary.symbol).toBe("AAPL");
    expect(summary.layoutId).toBe(DEFAULT_LAYOUT.layoutId);
    expect(summary.isActive).toBe(true);
  });

  it("marks the active tab in multi-tab summaries", () => {
    let state = createDefaultWorkspaceTabs();
    state = createTab(state, {
      id: "tab-2",
      title: "Swing",
      layout: {
        ...DEFAULT_LAYOUT,
        cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "MSFT" }],
      },
      remote: {
        resourceId: "remote-2",
        syncRevision: 2,
        updatedAt: "2026-07-04T10:00:00.000Z",
      },
    });

    const summaries = buildHomeWorkspaceSummaries(state);
    expect(summaries).toHaveLength(2);
    expect(summaries[0]?.isActive).toBe(false);
    expect(summaries[1]?.isActive).toBe(true);
    expect(summaries[1]?.symbol).toBe("MSFT");
    expect(summaries[1]?.remoteUpdatedAt).toBe("2026-07-04T10:00:00.000Z");
  });

  it("limits summaries to maxItems", () => {
    let state = createDefaultWorkspaceTabs();
    for (let index = 0; index < 5; index += 1) {
      state = createTab(state, { id: `tab-${index + 2}`, title: `Tab ${index + 2}` });
    }
    expect(buildHomeWorkspaceSummaries(state, 4)).toHaveLength(4);
  });
});
