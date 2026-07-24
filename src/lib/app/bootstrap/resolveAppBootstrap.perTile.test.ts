import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import { DEFAULT_SCREENER_STATE } from "@/lib/screener/screenStorage";
import { DEFAULT_WATCHLIST_STATE } from "@/lib/watchlist/storage";
import { createDefaultWorkspaceTabs } from "../workspaceTabs";
import { resolveChartTileBootstrapBinding } from "./chartTileBootstrapBinding";
import { resolveAppBootstrap } from "./resolveAppBootstrap";
import { seedWorkspaceTabsFromBinding } from "./seedWorkspaceTabsFromBinding";

describe("resolveAppBootstrap per-tile binding", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not adopt orphan remotes for non-primary tiles", async () => {
    const localTabs = createDefaultWorkspaceTabs();
    const loadLocal = vi.fn(() => ({
      workspaceTabs: localTabs,
      watchlist: DEFAULT_WATCHLIST_STATE,
      screener: DEFAULT_SCREENER_STATE,
    }));

    const fetchRemoteList = vi.fn(async () => [
      {
        id: "orphan-remote",
        workspaceName: "Orphan",
        syncRevision: 1,
        updatedAt: "2026-07-20T00:00:00.000Z",
        isDefault: false,
        chartLayoutSnapshot: {
          ...DEFAULT_LAYOUT,
          cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "NVDA" }],
        },
      },
    ]);

    const result = await resolveAppBootstrap({
      chartTileBinding: { tileId: "tile-secondary", isPrimaryChartTile: false },
      loadLocal,
      fetchRemoteList,
    });

    expect(result.remoteApplied).toBe(false);
    expect(result.workspaceTabs.tabs[0]?.layout.cells[0]?.symbol).toBe("AAPL");
    expect(result.workspaceTabs.tabs[0]?.remote).toBeUndefined();
  });

  it("merges only the bound chartWorkspaceId remote", async () => {
    const localTabs = createDefaultWorkspaceTabs();
    const binding = {
      tileId: "tile-secondary",
      isPrimaryChartTile: false,
      chartWorkspaceId: "bound-remote",
    };
    const loadLocal = vi.fn((options?: { chartTileBinding?: typeof binding }) => ({
      workspaceTabs: seedWorkspaceTabsFromBinding(
        localTabs,
        resolveChartTileBootstrapBinding(options?.chartTileBinding ?? binding),
      ),
      watchlist: DEFAULT_WATCHLIST_STATE,
      screener: DEFAULT_SCREENER_STATE,
    }));

    const fetchRemoteList = vi.fn(async () => [
      {
        id: "bound-remote",
        workspaceName: "Bound",
        syncRevision: 2,
        updatedAt: "2026-07-20T12:00:00.000Z",
        isDefault: false,
        chartLayoutSnapshot: {
          ...DEFAULT_LAYOUT,
          cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "TSLA" }],
        },
      },
      {
        id: "other-remote",
        workspaceName: "Other",
        syncRevision: 1,
        updatedAt: "2026-07-20T00:00:00.000Z",
        isDefault: false,
        chartLayoutSnapshot: {
          ...DEFAULT_LAYOUT,
          cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "NVDA" }],
        },
      },
    ]);

    const result = await resolveAppBootstrap({
      chartTileBinding: binding,
      loadLocal,
      fetchRemoteList,
    });

    expect(result.remoteApplied).toBe(true);
    expect(result.workspaceTabs.tabs[0]?.remote?.resourceId).toBe("bound-remote");
    expect(result.workspaceTabs.tabs[0]?.layout.cells[0]?.symbol).toBe("TSLA");
  });
});
