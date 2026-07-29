import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import { createDefaultWorkspaceTabs } from "@/lib/app/workspaceTabs";
import { workspaceActiveContentKey } from "./useWorkspaceTabsRemoteSync";

const mocks = vi.hoisted(() => ({
  createChartWorkspaceRemote: vi.fn(),
  saveChartWorkspaceRemote: vi.fn(),
  recordDismissedRemoteWorkspace: vi.fn(),
}));

vi.mock("@/lib/persistence/client/chartWorkspaceClient", () => ({
  createChartWorkspaceRemote: mocks.createChartWorkspaceRemote,
  saveChartWorkspaceRemote: mocks.saveChartWorkspaceRemote,
}));

vi.mock("@/lib/app/workspaceTabsStorage", () => ({
  recordDismissedRemoteWorkspace: mocks.recordDismissedRemoteWorkspace,
}));

import {
  mergeWorkspaceTabsApply,
  useWorkspaceTabsRemoteSync,
} from "./useWorkspaceTabsRemoteSync";

describe("useWorkspaceTabsRemoteSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("workspaceActiveContentKey is stable when layout reference is unchanged", () => {
    const tabs = createDefaultWorkspaceTabs();
    const first = workspaceActiveContentKey(tabs);
    const second = workspaceActiveContentKey(tabs);
    expect(second).toBe(first);
    expect(first.includes("\0")).toBe(true);
  });

  it("creates remote workspace when active tab has no remote id", async () => {
    mocks.createChartWorkspaceRemote.mockResolvedValue({
      id: "workspace-new",
      workspaceName: "Default",
      schemaVersion: 1,
      syncRevision: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      chartLayoutSnapshot: DEFAULT_LAYOUT,
    });

    const onApplyWorkspaceTabs = vi.fn();
    const tabs = createDefaultWorkspaceTabs();

    const { rerender } = renderHook(({ workspaceTabs }) =>
      useWorkspaceTabsRemoteSync({
        workspaceTabs,
        hydrated: true,
        bootstrapRemoteApplied: true,
        onApplyWorkspaceTabs,
      }),
    {
      initialProps: { workspaceTabs: tabs },
    });

    rerender({
      workspaceTabs: {
        ...tabs,
        tabs: [
          {
            ...tabs.tabs[0]!,
            layout: { ...DEFAULT_LAYOUT, linkSymbol: true },
          },
        ],
      },
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 900));
    });

    await waitFor(() => {
      expect(mocks.createChartWorkspaceRemote).toHaveBeenCalled();
      expect(onApplyWorkspaceTabs).toHaveBeenCalled();
    });
  });

  it("recreates remote workspace when save returns 404 for stale id", async () => {
    const staleId = "709905f3-bbc1-451b-9b64-8070255b3802";
    const tabs = createDefaultWorkspaceTabs(DEFAULT_LAYOUT, {
      resourceId: staleId,
      syncRevision: 3,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    mocks.saveChartWorkspaceRemote.mockResolvedValue({
      ok: false,
      status: 404,
      code: "not_found",
    });
    mocks.createChartWorkspaceRemote.mockResolvedValue({
      id: "workspace-recreated",
      workspaceName: "Default",
      schemaVersion: 1,
      syncRevision: 1,
      updatedAt: "2026-01-03T00:00:00.000Z",
      chartLayoutSnapshot: DEFAULT_LAYOUT,
    });

    const onApplyWorkspaceTabs = vi.fn();
    const onRemoteResourceCreated = vi.fn();

    const { rerender } = renderHook(({ workspaceTabs }) =>
      useWorkspaceTabsRemoteSync({
        workspaceTabs,
        hydrated: true,
        bootstrapRemoteApplied: true,
        onApplyWorkspaceTabs,
        onRemoteResourceCreated,
      }),
    {
      initialProps: { workspaceTabs: tabs },
    });

    rerender({
      workspaceTabs: {
        ...tabs,
        tabs: [
          {
            ...tabs.tabs[0]!,
            layout: { ...DEFAULT_LAYOUT, linkSymbol: true },
          },
        ],
      },
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 900));
    });

    await waitFor(() => {
      expect(mocks.saveChartWorkspaceRemote).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: staleId }),
      );
      expect(mocks.recordDismissedRemoteWorkspace).toHaveBeenCalledWith(staleId);
      expect(mocks.createChartWorkspaceRemote).toHaveBeenCalledTimes(1);
      expect(onRemoteResourceCreated).toHaveBeenCalledWith("workspace-recreated");
      const applied = onApplyWorkspaceTabs.mock.calls.at(-1)?.[0];
      expect(applied.tabs[0]?.remote?.resourceId).toBe("workspace-recreated");
      expect(applied.tabs[0]?.remote?.syncRevision).toBe(1);
    });
  });

  it("uses recreated remote id on subsequent save without creating again", async () => {
    const staleId = "709905f3-bbc1-451b-9b64-8070255b3802";
    const recreatedId = "workspace-recreated";
    const tabs = createDefaultWorkspaceTabs(DEFAULT_LAYOUT, {
      resourceId: staleId,
      syncRevision: 3,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    mocks.saveChartWorkspaceRemote
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        code: "not_found",
      })
      .mockResolvedValueOnce({
        ok: true,
        record: {
          id: recreatedId,
          workspaceName: "Default",
          schemaVersion: 1,
          syncRevision: 2,
          updatedAt: "2026-01-04T00:00:00.000Z",
          chartLayoutSnapshot: DEFAULT_LAYOUT,
        },
      });
    mocks.createChartWorkspaceRemote.mockResolvedValue({
      id: recreatedId,
      workspaceName: "Default",
      schemaVersion: 1,
      syncRevision: 1,
      updatedAt: "2026-01-03T00:00:00.000Z",
      chartLayoutSnapshot: DEFAULT_LAYOUT,
    });

    const onApplyWorkspaceTabs = vi.fn();
    let latestTabs = tabs;

    const { rerender } = renderHook(({ workspaceTabs }) => {
      latestTabs = workspaceTabs;
      return useWorkspaceTabsRemoteSync({
        workspaceTabs,
        hydrated: true,
        bootstrapRemoteApplied: true,
        onApplyWorkspaceTabs,
      });
    }, {
      initialProps: { workspaceTabs: tabs },
    });

    rerender({
      workspaceTabs: {
        ...tabs,
        tabs: [
          {
            ...tabs.tabs[0]!,
            layout: { ...DEFAULT_LAYOUT, linkSymbol: true },
          },
        ],
      },
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 900));
    });

    await waitFor(() => {
      expect(mocks.createChartWorkspaceRemote).toHaveBeenCalledTimes(1);
    });

    const afterRecovery = onApplyWorkspaceTabs.mock.calls.at(-1)?.[0] ?? latestTabs;

    rerender({
      workspaceTabs: {
        ...afterRecovery,
        tabs: [
          {
            ...afterRecovery.tabs[0]!,
            layout: { ...afterRecovery.tabs[0]!.layout, linkInterval: true },
          },
        ],
      },
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 900));
    });

    await waitFor(() => {
      expect(mocks.createChartWorkspaceRemote).toHaveBeenCalledTimes(1);
      expect(mocks.saveChartWorkspaceRemote).toHaveBeenLastCalledWith(
        expect.objectContaining({ workspaceId: recreatedId }),
      );
    });
  });

  it("applies conflict snapshot to active tab on 409", async () => {
    const tabs = createDefaultWorkspaceTabs(DEFAULT_LAYOUT, {
      resourceId: "workspace-1",
      syncRevision: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const remoteLayout = {
      ...DEFAULT_LAYOUT,
      cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "MSFT" }],
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

    const onApplyWorkspaceTabs = vi.fn();

    const { rerender } = renderHook(({ workspaceTabs }) =>
      useWorkspaceTabsRemoteSync({
        workspaceTabs,
        hydrated: true,
        bootstrapRemoteApplied: true,
        onApplyWorkspaceTabs,
      }),
    {
      initialProps: { workspaceTabs: tabs },
    });

    rerender({
      workspaceTabs: {
        ...tabs,
        tabs: [
          {
            ...tabs.tabs[0]!,
            layout: { ...DEFAULT_LAYOUT, linkInterval: true },
          },
        ],
      },
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 900));
    });

    await waitFor(() => {
      expect(onApplyWorkspaceTabs).toHaveBeenCalled();
      const applied = onApplyWorkspaceTabs.mock.calls.at(-1)?.[0];
      expect(applied.tabs[0]?.layout.cells[0]?.symbol).toBe("MSFT");
      expect(applied.tabs[0]?.remote?.syncRevision).toBe(2);
    });
  });

  it("preserves local sidebar activePanel when conflict snapshot arrives", async () => {
    const tabs = createDefaultWorkspaceTabs(
      {
        ...DEFAULT_LAYOUT,
        sidebar: { activePanel: "watchlist" },
      },
      {
        resourceId: "workspace-1",
        syncRevision: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    );

    mocks.saveChartWorkspaceRemote.mockResolvedValue({
      ok: false,
      status: 409,
      code: "conflict",
      current: {
        syncRevision: 2,
        updatedAt: "2026-01-02T00:00:00.000Z",
        chartLayoutSnapshot: {
          ...DEFAULT_LAYOUT,
          sidebar: { activePanel: null },
        },
      },
    });

    const onApplyWorkspaceTabs = vi.fn();

    const { rerender } = renderHook(({ workspaceTabs }) =>
      useWorkspaceTabsRemoteSync({
        workspaceTabs,
        hydrated: true,
        bootstrapRemoteApplied: true,
        onApplyWorkspaceTabs,
      }),
    {
      initialProps: { workspaceTabs: tabs },
    });

    rerender({
      workspaceTabs: {
        ...tabs,
        tabs: [
          {
            ...tabs.tabs[0]!,
            layout: {
              ...tabs.tabs[0]!.layout,
              linkInterval: true,
            },
          },
        ],
      },
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 900));
    });

    await waitFor(() => {
      const applied = onApplyWorkspaceTabs.mock.calls.at(-1)?.[0];
      expect(applied.tabs[0]?.layout.sidebar?.activePanel).toBe("watchlist");
      expect(applied.tabs[0]?.remote?.syncRevision).toBe(2);
    });
  });

  it("keeps latest local layout when a stale save completes", async () => {
    const tabs = createDefaultWorkspaceTabs(DEFAULT_LAYOUT, {
      resourceId: "workspace-1",
      syncRevision: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    let resolveSave: ((value: unknown) => void) | null = null;
    mocks.saveChartWorkspaceRemote.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );

    const onApplyWorkspaceTabs = vi.fn();
    let latestTabs = tabs;

    const { rerender } = renderHook(({ workspaceTabs }) => {
      latestTabs = workspaceTabs;
      return useWorkspaceTabsRemoteSync({
        workspaceTabs,
        hydrated: true,
        bootstrapRemoteApplied: true,
        onApplyWorkspaceTabs,
      });
    }, {
      initialProps: { workspaceTabs: tabs },
    });

    rerender({
      workspaceTabs: {
        ...tabs,
        tabs: [
          {
            ...tabs.tabs[0]!,
            layout: {
              ...DEFAULT_LAYOUT,
              cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "MSFT" }],
            },
          },
        ],
      },
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 900));
    });

    rerender({
      workspaceTabs: {
        ...latestTabs,
        tabs: [
          {
            ...latestTabs.tabs[0]!,
            layout: {
              ...latestTabs.tabs[0]!.layout,
              cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "AAPL" }],
            },
          },
        ],
      },
    });

    await act(async () => {
      resolveSave?.({
        ok: true,
        record: {
          id: "workspace-1",
          syncRevision: 2,
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(onApplyWorkspaceTabs).toHaveBeenCalled();
      expect(onApplyWorkspaceTabs.mock.calls.at(-1)?.[1]).toEqual({
        remoteMetadataOnly: true,
      });
      const applied = onApplyWorkspaceTabs.mock.calls.at(-1)?.[0];
      expect(applied.tabs[0]?.layout.cells[0]?.symbol).toBe("AAPL");
      expect(applied.tabs[0]?.remote?.syncRevision).toBe(2);
    });
  });

  it("mergeWorkspaceTabsApply keeps current layout for remote metadata saves", () => {
    const remote = {
      resourceId: "workspace-1",
      syncRevision: 2,
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    const current = createDefaultWorkspaceTabs(
      {
        ...DEFAULT_LAYOUT,
        cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "XLF" }],
      },
      remote,
    );
    const staleIncoming: typeof current = {
      ...current,
      tabs: [
        {
          ...current.tabs[0]!,
          layout: {
            ...DEFAULT_LAYOUT,
            cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "MSFT" }],
          },
          remote,
        },
      ],
    };

    const merged = mergeWorkspaceTabsApply(current, staleIncoming, {
      remoteMetadataOnly: true,
    });

    expect(merged.tabs[0]?.layout.cells[0]?.symbol).toBe("XLF");
    expect(merged.tabs[0]?.remote?.syncRevision).toBe(2);
  });

  it("applies deferred workspace merge when bootstrap timed out", async () => {
    const mergedTabs = createDefaultWorkspaceTabs({
      ...DEFAULT_LAYOUT,
      cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "AMD" }],
    });
    const finishRemoteWorkspaceMerge = vi.fn(async () => mergedTabs);
    const onApplyWorkspaceTabs = vi.fn();

    renderHook(() =>
      useWorkspaceTabsRemoteSync({
        workspaceTabs: createDefaultWorkspaceTabs(),
        hydrated: true,
        bootstrapRemotePending: true,
        finishRemoteWorkspaceMerge,
        onApplyWorkspaceTabs,
      }),
    );

    await waitFor(() => {
      expect(finishRemoteWorkspaceMerge).toHaveBeenCalled();
      expect(onApplyWorkspaceTabs).toHaveBeenCalledWith(mergedTabs);
    });
  });
});
