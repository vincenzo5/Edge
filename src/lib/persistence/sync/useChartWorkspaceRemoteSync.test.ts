import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_LAYOUT } from "@/lib/chartConfig";

const mocks = vi.hoisted(() => ({
  fetchDefaultChartWorkspace: vi.fn(),
  saveChartWorkspaceRemote: vi.fn(),
  getChartWorkspaceSyncMetadata: vi.fn(),
  setChartWorkspaceSyncMetadata: vi.fn(),
}));

vi.mock("@/lib/persistence/client/chartWorkspaceClient", () => ({
  fetchDefaultChartWorkspace: mocks.fetchDefaultChartWorkspace,
  saveChartWorkspaceRemote: mocks.saveChartWorkspaceRemote,
}));

vi.mock("@/lib/persistence/sync/syncMetadata", () => ({
  getChartWorkspaceSyncMetadata: mocks.getChartWorkspaceSyncMetadata,
  setChartWorkspaceSyncMetadata: mocks.setChartWorkspaceSyncMetadata,
  isRemoteNewer: vi.fn(() => false),
}));

import { useChartWorkspaceRemoteSync } from "./useChartWorkspaceRemoteSync";

describe("useChartWorkspaceRemoteSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.fetchDefaultChartWorkspace.mockResolvedValue({
      id: "workspace-1",
      workspaceName: "Default",
      schemaVersion: 1,
      syncRevision: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      chartLayoutSnapshot: DEFAULT_LAYOUT,
    });

    mocks.getChartWorkspaceSyncMetadata.mockReturnValue({
      resourceId: "workspace-1",
      syncRevision: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("applies the remote layout when a save conflict returns current snapshot data", async () => {
    const remoteLayout = {
      ...DEFAULT_LAYOUT,
      cells: [{ ...DEFAULT_LAYOUT.cells[0], symbol: "MSFT" }],
    };

    mocks.saveChartWorkspaceRemote.mockResolvedValue({
      ok: false,
      status: 409,
      code: "conflict",
      current: {
        syncRevision: 2,
        updatedAt: "2026-01-02T00:00:00.000Z",
        chartLayoutSnapshot: remoteLayout,
      },
    });

    const onApplyRemoteLayout = vi.fn();

    const { rerender } = renderHook(({ layout }) =>
      useChartWorkspaceRemoteSync({
        layout,
        hydrated: true,
        onApplyRemoteLayout,
      }),
    {
      initialProps: { layout: DEFAULT_LAYOUT },
    });

    await waitFor(() => {
      expect(mocks.fetchDefaultChartWorkspace).toHaveBeenCalled();
    });

    rerender({
      layout: {
        ...DEFAULT_LAYOUT,
        linkSymbol: true,
        linkInterval: true,
        linkCrosshair: true,
      },
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 900));
    });

    await waitFor(() => {
      expect(onApplyRemoteLayout).toHaveBeenCalledWith(remoteLayout);
      expect(mocks.setChartWorkspaceSyncMetadata).toHaveBeenCalledWith({
        resourceId: "workspace-1",
        syncRevision: 2,
        updatedAt: "2026-01-02T00:00:00.000Z",
      });
    });
  });

  it("skips initial remote fetch when bootstrap already applied remote layout", async () => {
    const onApplyRemoteLayout = vi.fn();

    renderHook(() =>
      useChartWorkspaceRemoteSync({
        layout: DEFAULT_LAYOUT,
        hydrated: true,
        bootstrapRemoteApplied: true,
        onApplyRemoteLayout,
      }),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mocks.fetchDefaultChartWorkspace).not.toHaveBeenCalled();
    expect(onApplyRemoteLayout).not.toHaveBeenCalled();
  });

  it("applies late remote layout via finishRemoteLayout when bootstrap timed out", async () => {
    const remoteLayout = {
      ...DEFAULT_LAYOUT,
      cells: [{ ...DEFAULT_LAYOUT.cells[0], symbol: "AMD" }],
    };
    const finishRemoteLayout = vi.fn(async () => remoteLayout);
    const onApplyRemoteLayout = vi.fn();

    renderHook(() =>
      useChartWorkspaceRemoteSync({
        layout: DEFAULT_LAYOUT,
        hydrated: true,
        bootstrapRemotePending: true,
        finishRemoteLayout,
        onApplyRemoteLayout,
      }),
    );

    await waitFor(() => {
      expect(finishRemoteLayout).toHaveBeenCalled();
      expect(onApplyRemoteLayout).toHaveBeenCalledWith(remoteLayout);
    });

    expect(mocks.fetchDefaultChartWorkspace).not.toHaveBeenCalled();
  });
});
