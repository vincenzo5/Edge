import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import { DEFAULT_SCREENER_STATE } from "@/lib/screener/screenStorage";
import { DEFAULT_WATCHLIST_STATE } from "@/lib/watchlist/storage";
import { createDefaultWorkspaceTabs } from "../workspaceTabs";
import { WORKSPACE_TABS_STORAGE_KEY } from "../workspaceTabsStorage";
import { resolveAppBootstrap } from "./resolveAppBootstrap";

const localTabs = createDefaultWorkspaceTabs();

const localState = {
  workspaceTabs: localTabs,
  watchlist: DEFAULT_WATCHLIST_STATE,
  screener: DEFAULT_SCREENER_STATE,
};

describe("resolveAppBootstrap", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
  });

  it("returns local state when remote fetch resolves null", async () => {
    const result = await resolveAppBootstrap({
      loadLocal: () => localState,
      fetchRemoteList: async () => null,
    });

    expect(result.workspaceTabs).toEqual(localTabs);
    expect(result.watchlist).toEqual(DEFAULT_WATCHLIST_STATE);
    expect(result.remoteApplied).toBe(false);
    expect(result.remotePending).toBe(false);
    expect(result.finishRemoteWorkspaceMerge).toBeUndefined();
  });

  it("merges newer remote workspace within timeout", async () => {
    const remoteLayout = {
      ...DEFAULT_LAYOUT,
      cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "NVDA" }],
    };

    const result = await resolveAppBootstrap({
      loadLocal: () => ({
        ...localState,
        workspaceTabs: createDefaultWorkspaceTabs(DEFAULT_LAYOUT, {
          resourceId: "workspace-1",
          syncRevision: 1,
          updatedAt: "2026-01-01T00:00:00.000Z",
        }),
      }),
      fetchRemoteList: async () => [
        {
          id: "workspace-1",
          workspaceName: "Default",
          schemaVersion: 1,
          syncRevision: 2,
          updatedAt: "2026-07-04T00:00:00.000Z",
          isDefault: true,
          chartLayoutSnapshot: remoteLayout,
        },
      ],
    });

    const tab = result.workspaceTabs.tabs[0];
    expect(tab?.layout.cells[0]?.symbol).toBe("NVDA");
    expect(tab?.remote?.resourceId).toBe("workspace-1");
    expect(result.remoteApplied).toBe(true);
    expect(result.remotePending).toBe(false);
  });

  it("adopts orphan remote workspaces as new tabs", async () => {
    const result = await resolveAppBootstrap({
      loadLocal: () => ({
        ...localState,
        workspaceTabs: createDefaultWorkspaceTabs(DEFAULT_LAYOUT, {
          resourceId: "workspace-1",
          syncRevision: 1,
          updatedAt: "2026-01-01T00:00:00.000Z",
        }),
      }),
      fetchRemoteList: async () => [
        {
          id: "workspace-1",
          workspaceName: "Default",
          schemaVersion: 1,
          syncRevision: 1,
          updatedAt: "2026-07-04T00:00:00.000Z",
          isDefault: true,
          chartLayoutSnapshot: DEFAULT_LAYOUT,
        },
        {
          id: "workspace-2",
          workspaceName: "Tech",
          schemaVersion: 1,
          syncRevision: 1,
          updatedAt: "2026-07-05T00:00:00.000Z",
          isDefault: false,
          chartLayoutSnapshot: {
            ...DEFAULT_LAYOUT,
            cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "MSFT" }],
          },
        },
      ],
    });

    expect(result.workspaceTabs.tabs).toHaveLength(2);
    expect(result.remoteApplied).toBe(true);
  });

  it("does not adopt orphan remotes when workspace tabs are persisted locally", async () => {
    localStorage.setItem(
      WORKSPACE_TABS_STORAGE_KEY,
      JSON.stringify(
        createDefaultWorkspaceTabs(DEFAULT_LAYOUT, {
          resourceId: "workspace-1",
          syncRevision: 1,
          updatedAt: "2026-01-01T00:00:00.000Z",
        }),
      ),
    );

    const result = await resolveAppBootstrap({
      loadLocal: () => ({
        ...localState,
        workspaceTabs: createDefaultWorkspaceTabs(DEFAULT_LAYOUT, {
          resourceId: "workspace-1",
          syncRevision: 1,
          updatedAt: "2026-01-01T00:00:00.000Z",
        }),
      }),
      fetchRemoteList: async () => [
        {
          id: "workspace-1",
          workspaceName: "Default",
          schemaVersion: 1,
          syncRevision: 1,
          updatedAt: "2026-07-04T00:00:00.000Z",
          isDefault: true,
          chartLayoutSnapshot: DEFAULT_LAYOUT,
        },
        {
          id: "workspace-2",
          workspaceName: "AAPL",
          schemaVersion: 1,
          syncRevision: 1,
          updatedAt: "2026-07-05T00:00:00.000Z",
          isDefault: false,
          chartLayoutSnapshot: {
            ...DEFAULT_LAYOUT,
            cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "AAPL" }],
          },
        },
      ],
    });

    expect(result.workspaceTabs.tabs).toHaveLength(1);
    expect(result.remoteApplied).toBe(false);
  });

  it("returns local tabs when remote fetch rejects", async () => {
    const result = await resolveAppBootstrap({
      loadLocal: () => localState,
      fetchRemoteList: async () => {
        throw new Error("network down");
      },
    });

    expect(result.workspaceTabs).toEqual(localTabs);
    expect(result.remoteApplied).toBe(false);
  });

  it("returns local tabs with remotePending when remote fetch times out", async () => {
    let resolveRemote!: (
      value: Awaited<ReturnType<NonNullable<Parameters<typeof resolveAppBootstrap>[0]["fetchRemoteList"]>>>,
    ) => void;
    const remotePromise = new Promise<
      Awaited<ReturnType<NonNullable<Parameters<typeof resolveAppBootstrap>[0]["fetchRemoteList"]>>>
    >((resolve) => {
      resolveRemote = resolve;
    });

    const localWithRemote = {
      ...localState,
      workspaceTabs: createDefaultWorkspaceTabs(DEFAULT_LAYOUT, {
        resourceId: "workspace-1",
        syncRevision: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    };

    const bootstrapPromise = resolveAppBootstrap({
      loadLocal: () => localWithRemote,
      fetchRemoteList: () => remotePromise,
      remoteTimeoutMs: 10,
      sleep: async (ms) => {
        await new Promise((resolve) => setTimeout(resolve, ms));
      },
    });

    const result = await bootstrapPromise;
    expect(result.workspaceTabs).toEqual(localWithRemote.workspaceTabs);
    expect(result.remoteApplied).toBe(false);
    expect(result.remotePending).toBe(true);
    expect(result.finishRemoteWorkspaceMerge).toBeTypeOf("function");

    const remoteLayout = {
      ...DEFAULT_LAYOUT,
      cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "TSLA" }],
    };
    resolveRemote([
      {
        id: "workspace-1",
        workspaceName: "Default",
        schemaVersion: 1,
        syncRevision: 2,
        updatedAt: "2026-07-04T00:00:00.000Z",
        isDefault: true,
        chartLayoutSnapshot: remoteLayout,
      },
    ]);

    const merged = await result.finishRemoteWorkspaceMerge?.();
    expect(merged?.tabs[0]?.layout.cells[0]?.symbol).toBe("TSLA");
  });
});
