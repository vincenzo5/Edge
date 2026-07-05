"use client";

import { useCallback, useEffect, useRef } from "react";

import type { ChartLayout } from "@/lib/chartConfig";
import {
  createChartWorkspaceRemote,
  saveChartWorkspaceRemote,
} from "@/lib/persistence/client/chartWorkspaceClient";
import {
  getActiveTab,
  updateTabLayout,
  updateTabRemote,
  type WorkspaceTabsState,
} from "@/lib/app/workspaceTabs";
import { mergeRemoteConflictLayout } from "./mergeRemoteConflictLayout";

/** Stable key for the active tab layout — excludes remote sync metadata. */
export function workspaceActiveContentKey(tabs: WorkspaceTabsState): string {
  const active = getActiveTab(tabs);
  return `${active.id}\0${active.title}\0${JSON.stringify(active.layout)}`;
}

async function persistActiveTab(
  tabs: WorkspaceTabsState,
  getLatestTabs: () => WorkspaceTabsState,
): Promise<WorkspaceTabsState | null> {
  const active = getActiveTab(tabs);

  if (!active.remote?.resourceId) {
    const created = await createChartWorkspaceRemote({
      workspaceName: active.title,
      chartLayoutSnapshot: active.layout,
    });
    if (!created) return null;
    const latestTabs = getLatestTabs();
    const latestActive = getActiveTab(latestTabs);
    return updateTabRemote(latestTabs, latestActive.id, {
      resourceId: created.id,
      syncRevision: created.syncRevision,
      updatedAt: created.updatedAt,
    });
  }

  const result = await saveChartWorkspaceRemote({
    workspaceId: active.remote.resourceId,
    baseRevision: active.remote.syncRevision,
    chartLayoutSnapshot: active.layout,
    workspaceName: active.title,
  });

  if (result.ok) {
    const latestTabs = getLatestTabs();
    const latestActive = getActiveTab(latestTabs);
    return updateTabRemote(latestTabs, latestActive.id, {
      resourceId: result.record.id,
      syncRevision: result.record.syncRevision,
      updatedAt: result.record.updatedAt,
    });
  }

  if (result.current?.chartLayoutSnapshot) {
    const latestTabs = getLatestTabs();
    const latestActive = getActiveTab(latestTabs);
    const mergedLayout = mergeRemoteConflictLayout(
      latestActive.layout,
      result.current.chartLayoutSnapshot as ChartLayout,
    );
    let next = updateTabLayout(latestTabs, latestActive.id, mergedLayout);
    next = updateTabRemote(next, latestActive.id, {
      resourceId: latestActive.remote!.resourceId,
      syncRevision: result.current.syncRevision,
      updatedAt: result.current.updatedAt,
    });
    return next;
  }

  return null;
}

export type ApplyWorkspaceTabsOptions = {
  /** Successful save/create — merge remote revision onto current tabs, not incoming layout. */
  remoteMetadataOnly?: boolean;
};

export function mergeWorkspaceTabsApply(
  current: WorkspaceTabsState,
  incoming: WorkspaceTabsState,
  applyOptions?: ApplyWorkspaceTabsOptions,
): WorkspaceTabsState {
  const incomingActive = getActiveTab(incoming);
  const currentActive = getActiveTab(current);

  if (
    applyOptions?.remoteMetadataOnly &&
    incoming.activeTabId === current.activeTabId &&
    incoming.tabs.length === current.tabs.length &&
    incomingActive.id === currentActive.id &&
    incomingActive.remote
  ) {
    return updateTabRemote(current, currentActive.id, incomingActive.remote);
  }

  return incoming;
}

export function useWorkspaceTabsRemoteSync(options: {
  workspaceTabs: WorkspaceTabsState;
  hydrated: boolean;
  bootstrapRemoteApplied?: boolean;
  bootstrapRemotePending?: boolean;
  finishRemoteWorkspaceMerge?: () => Promise<WorkspaceTabsState | null>;
  onApplyWorkspaceTabs: (
    tabs: WorkspaceTabsState,
    applyOptions?: ApplyWorkspaceTabsOptions,
  ) => void;
}): { flushActiveTabSave: () => Promise<void> } {
  const tabsRef = useRef(options.workspaceTabs);
  const syncingRef = useRef(false);
  const remoteHydratedRef = useRef(false);
  const pendingRemoteStartedRef = useRef(false);
  const flushResolverRef = useRef<(() => void) | null>(null);
  const lastSavedContentKeyRef = useRef<string | null>(null);

  tabsRef.current = options.workspaceTabs;

  const applyPersistResult = useCallback(
    (next: WorkspaceTabsState) => {
      const currentKey = workspaceActiveContentKey(tabsRef.current);
      const nextKey = workspaceActiveContentKey(next);
      options.onApplyWorkspaceTabs(
        next,
        nextKey === currentKey ? { remoteMetadataOnly: true } : undefined,
      );
      lastSavedContentKeyRef.current = nextKey;
    },
    [options.onApplyWorkspaceTabs],
  );

  const flushActiveTabSave = useCallback(async () => {
    if (syncingRef.current) {
      await new Promise<void>((resolve) => {
        flushResolverRef.current = resolve;
      });
      return;
    }

    syncingRef.current = true;
    try {
      const next = await persistActiveTab(tabsRef.current, () => tabsRef.current);
      if (next) {
        applyPersistResult(next);
      }
    } finally {
      syncingRef.current = false;
      flushResolverRef.current?.();
      flushResolverRef.current = null;
    }
  }, [applyPersistResult]);

  useEffect(() => {
    if (!options.hydrated || remoteHydratedRef.current) return;

    if (options.bootstrapRemoteApplied) {
      remoteHydratedRef.current = true;
      lastSavedContentKeyRef.current = workspaceActiveContentKey(options.workspaceTabs);
      return;
    }

    if (options.bootstrapRemotePending && options.finishRemoteWorkspaceMerge) {
      if (pendingRemoteStartedRef.current) return;
      pendingRemoteStartedRef.current = true;
      void options.finishRemoteWorkspaceMerge().then((tabs) => {
        if (tabs) {
          options.onApplyWorkspaceTabs(tabs);
          lastSavedContentKeyRef.current = workspaceActiveContentKey(tabs);
        }
        remoteHydratedRef.current = true;
      });
      return;
    }

    remoteHydratedRef.current = true;
    lastSavedContentKeyRef.current = workspaceActiveContentKey(options.workspaceTabs);
  }, [
    options.hydrated,
    options.bootstrapRemoteApplied,
    options.bootstrapRemotePending,
    options.finishRemoteWorkspaceMerge,
    options.onApplyWorkspaceTabs,
  ]);

  useEffect(() => {
    if (!options.hydrated || !remoteHydratedRef.current) return;

    const contentKey = workspaceActiveContentKey(options.workspaceTabs);
    if (contentKey === lastSavedContentKeyRef.current) return;

    const timer = window.setTimeout(() => {
      if (syncingRef.current) return;
      if (workspaceActiveContentKey(tabsRef.current) === lastSavedContentKeyRef.current) return;
      syncingRef.current = true;

      void (async () => {
        try {
          const next = await persistActiveTab(tabsRef.current, () => tabsRef.current);
          if (next) {
            applyPersistResult(next);
          }
        } finally {
          syncingRef.current = false;
          flushResolverRef.current?.();
          flushResolverRef.current = null;
        }
      })();
    }, 800);

    return () => window.clearTimeout(timer);
  }, [options.hydrated, options.workspaceTabs, applyPersistResult]);

  return { flushActiveTabSave };
}
