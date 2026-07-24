import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import { createDefaultWorkspaceTabs } from "../workspaceTabs";
import { resolveHomeWorkspaceTabs } from "./resolveHomeWorkspaceTabs";

const localTabs = createDefaultWorkspaceTabs();

describe("resolveHomeWorkspaceTabs", () => {
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

  it("returns local tabs when remote fetch resolves null", async () => {
    const result = await resolveHomeWorkspaceTabs({
      loadLocal: () => localTabs,
      fetchRemoteList: async () => null,
    });

    expect(result.tabs).toEqual(localTabs);
    expect(result.remoteApplied).toBe(false);
    expect(result.remotePending).toBe(false);
  });

  it("adopts orphan remote workspaces for home cards", async () => {
    const result = await resolveHomeWorkspaceTabs({
      loadLocal: () => ({
        ...localTabs,
        tabs: localTabs.tabs.map((tab) => ({
          ...tab,
          remote: {
            resourceId: "workspace-1",
            syncRevision: 1,
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        })),
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
          workspaceName: "Remote only",
          schemaVersion: 1,
          syncRevision: 1,
          updatedAt: "2026-07-05T00:00:00.000Z",
          isDefault: false,
          chartLayoutSnapshot: {
            ...DEFAULT_LAYOUT,
            cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "NVDA" }],
          },
        },
      ],
    });

    expect(result.remoteApplied).toBe(true);
    expect(result.tabs.tabs).toHaveLength(2);
    expect(result.tabs.tabs[1]?.title).toBe("Remote only");
    expect(result.tabs.tabs[1]?.layout.cells[0]?.symbol).toBe("NVDA");
  });

  it("returns local tabs with pending late merge on timeout", async () => {
    let resolveRemote!: (
      value: Awaited<ReturnType<NonNullable<Parameters<typeof resolveHomeWorkspaceTabs>[0]["fetchRemoteList"]>>>,
    ) => void;
    const remotePromise = new Promise<
      Awaited<ReturnType<NonNullable<Parameters<typeof resolveHomeWorkspaceTabs>[0]["fetchRemoteList"]>>>
    >((resolve) => {
      resolveRemote = resolve;
    });

    const localWithRemote = createDefaultWorkspaceTabs(DEFAULT_LAYOUT, {
      resourceId: "workspace-1",
      syncRevision: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const result = await resolveHomeWorkspaceTabs({
      loadLocal: () => localWithRemote,
      fetchRemoteList: () => remotePromise,
      remoteTimeoutMs: 10,
      sleep: async (ms) => {
        await new Promise((resolve) => setTimeout(resolve, ms));
      },
    });

    expect(result.tabs).toEqual(localWithRemote);
    expect(result.remotePending).toBe(true);

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
