import { describe, expect, it, vi } from "vitest";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import { DEFAULT_SCREENER_STATE } from "@/lib/screener/screenStorage";
import { DEFAULT_WATCHLIST_STATE } from "@/lib/watchlist/storage";
import { resolveAppBootstrap } from "./resolveAppBootstrap";

const localState = {
  layout: DEFAULT_LAYOUT,
  watchlist: DEFAULT_WATCHLIST_STATE,
  screener: DEFAULT_SCREENER_STATE,
};

describe("resolveAppBootstrap", () => {
  it("returns local state when remote fetch resolves null", async () => {
    const result = await resolveAppBootstrap({
      loadLocal: () => localState,
      fetchRemote: async () => null,
    });

    expect(result.layout).toEqual(DEFAULT_LAYOUT);
    expect(result.watchlist).toEqual(DEFAULT_WATCHLIST_STATE);
    expect(result.remoteApplied).toBe(false);
    expect(result.remotePending).toBe(false);
    expect(result.finishRemoteLayout).toBeUndefined();
  });

  it("merges newer remote layout within timeout", async () => {
    const remoteLayout = {
      ...DEFAULT_LAYOUT,
      cells: [{ ...DEFAULT_LAYOUT.cells[0], symbol: "NVDA" }],
    };

    const result = await resolveAppBootstrap({
      loadLocal: () => localState,
      fetchRemote: async () => ({
        id: "workspace-1",
        workspaceName: "Default",
        schemaVersion: 1,
        syncRevision: 2,
        updatedAt: "2026-07-04T00:00:00.000Z",
        chartLayoutSnapshot: remoteLayout,
      }),
      getSyncMetadata: () => null,
      setSyncMetadata: vi.fn(),
    });

    expect(result.layout.cells[0]?.symbol).toBe("NVDA");
    expect(result.remoteApplied).toBe(true);
    expect(result.remotePending).toBe(false);
  });

  it("returns local layout with remotePending when remote fetch times out", async () => {
    let resolveRemote!: (value: Awaited<ReturnType<NonNullable<Parameters<typeof resolveAppBootstrap>[0]["fetchRemote"]>>>) => void;
    const remotePromise = new Promise<
      Awaited<ReturnType<NonNullable<Parameters<typeof resolveAppBootstrap>[0]["fetchRemote"]>>>
    >((resolve) => {
      resolveRemote = resolve;
    });

    const bootstrapPromise = resolveAppBootstrap({
      loadLocal: () => localState,
      fetchRemote: () => remotePromise,
      remoteTimeoutMs: 10,
      sleep: async (ms) => {
        await new Promise((resolve) => setTimeout(resolve, ms));
      },
    });

    const result = await bootstrapPromise;
    expect(result.layout).toEqual(DEFAULT_LAYOUT);
    expect(result.remoteApplied).toBe(false);
    expect(result.remotePending).toBe(true);
    expect(result.finishRemoteLayout).toBeTypeOf("function");

    const remoteLayout = {
      ...DEFAULT_LAYOUT,
      cells: [{ ...DEFAULT_LAYOUT.cells[0], symbol: "TSLA" }],
    };
    resolveRemote({
      id: "workspace-1",
      workspaceName: "Default",
      schemaVersion: 1,
      syncRevision: 3,
      updatedAt: "2026-07-05T00:00:00.000Z",
      chartLayoutSnapshot: remoteLayout,
    });

    const merged = await result.finishRemoteLayout?.();
    expect(merged?.cells[0]?.symbol).toBe("TSLA");
  });
});
