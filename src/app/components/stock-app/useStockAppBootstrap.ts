"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  saveWorkspaceTabs,
  type WorkspaceTabsStorageBinding,
} from "@/lib/app/workspaceTabsStorage";
import {
  createDefaultWorkspaceTabs,
  getActiveLayout,
  getActiveTab,
  pruneToSingleActiveTab,
  updateActiveTabLayout,
  type WorkspaceTabsState,
} from "@/lib/app/workspaceTabs";
import {
  mergeWorkspaceTabsApply,
  type ApplyWorkspaceTabsOptions,
} from "@/lib/persistence/sync/useWorkspaceTabsRemoteSync";
import { resolveAppBootstrap, type AppBootstrapResult } from "@/lib/app/bootstrap/resolveAppBootstrap";
import { loadLocalAppState } from "@/lib/app/bootstrap/loadLocalAppState";
import type { ChartTileBootstrapBinding } from "@/lib/app/bootstrap/chartTileBootstrapBinding";
import { resolveChartTileBootstrapBinding } from "@/lib/app/bootstrap/chartTileBootstrapBinding";
import type { WatchlistState } from "@/lib/watchlist/types";
import type { ScreenerState } from "@/lib/screener/types";
import type { ScreenerSessionState } from "@/lib/screener/screenerSession";
import { createDefaultScreenerSession } from "@/lib/screener/screenerSession";
import { useChartTemplateLibraryRemoteSync } from "@/lib/persistence/sync/useChartTemplateLibraryRemoteSync";
import { useWorkspaceTabsRemoteSync } from "@/lib/persistence/sync/useWorkspaceTabsRemoteSync";
import type { ChartLayout } from "@/lib/chartConfig";
import {
  collectLayoutCells,
  registerCellLayoutFlushHandler,
  syncCellLayoutStoreFromLayout,
} from "@/lib/chart/cellLayoutStore";
import { cellCountFor } from "@/lib/chartConfig";

export type UseStockAppBootstrapOptions = {
  chartTileBinding?: ChartTileBootstrapBinding;
  onChartWorkspaceIdCreated?: (resourceId: string) => void;
};

export function useStockAppBootstrap(options: UseStockAppBootstrapOptions = {}) {
  const binding = useMemo(
    () => resolveChartTileBootstrapBinding(options.chartTileBinding),
    [
      options.chartTileBinding?.tileId,
      options.chartTileBinding?.isPrimaryChartTile,
      options.chartTileBinding?.chartWorkspaceId,
    ],
  );
  const storageBinding = useMemo(
    (): WorkspaceTabsStorageBinding => ({
      tileId: binding.tileId,
      isPrimaryChartTile: binding.isPrimaryChartTile,
    }),
    [binding.tileId, binding.isPrimaryChartTile],
  );
  const onChartWorkspaceIdCreatedRef = useRef(options.onChartWorkspaceIdCreated);
  onChartWorkspaceIdCreatedRef.current = options.onChartWorkspaceIdCreated;

  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceTabsState>(() =>
    createDefaultWorkspaceTabs(),
  );
  const [watchlistBootstrap, setWatchlistBootstrap] = useState<WatchlistState | null>(null);
  const [screenerBootstrap, setScreenerBootstrap] = useState<ScreenerState | null>(null);
  const [screenerSessionBootstrap, setScreenerSessionBootstrap] =
    useState<ScreenerSessionState | null>(null);
  const [bootstrapRemoteApplied, setBootstrapRemoteApplied] = useState(false);
  const [bootstrapRemotePending, setBootstrapRemotePending] = useState(false);
  const finishRemoteWorkspaceMergeRef =
    useRef<AppBootstrapResult["finishRemoteWorkspaceMerge"]>(undefined);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);
  const workspaceTabsRef = useRef(workspaceTabs);
  const flushActiveTabSaveRef = useRef<() => Promise<void>>(async () => {});

  workspaceTabsRef.current = workspaceTabs;

  const layout = useMemo(() => getActiveLayout(workspaceTabs), [workspaceTabs]);
  const activeTab = useMemo(() => getActiveTab(workspaceTabs), [workspaceTabs]);

  const setLayout = useCallback(
    (updater: ChartLayout | ((prev: ChartLayout) => ChartLayout)) => {
      setWorkspaceTabs((prev) => {
        const next = updateActiveTabLayout(prev, updater);
        syncCellLayoutStoreFromLayout(getActiveLayout(next));
        return next;
      });
    },
    [],
  );

  const applyBootstrapResult = useCallback(
    (result: AppBootstrapResult) => {
      const prunedTabs = pruneToSingleActiveTab(result.workspaceTabs);
      workspaceTabsRef.current = prunedTabs;
      syncCellLayoutStoreFromLayout(getActiveLayout(prunedTabs));
      setWorkspaceTabs(prunedTabs);
      saveWorkspaceTabs(prunedTabs, storageBinding);
      setWatchlistBootstrap(result.watchlist);
      setScreenerBootstrap(result.screener);
      setScreenerSessionBootstrap(result.screenerSession);
      setBootstrapRemoteApplied(result.remoteApplied);
      setBootstrapRemotePending(result.remotePending);
      finishRemoteWorkspaceMergeRef.current = result.finishRemoteWorkspaceMerge;
      hydratedRef.current = true;
      setHydrated(true);
    },
    [storageBinding],
  );

  const hydrateFromLocalFallback = useCallback(() => {
    try {
      const local = loadLocalAppState({ chartTileBinding: binding });
      applyBootstrapResult({
        workspaceTabs: local.workspaceTabs,
        watchlist: local.watchlist,
        screener: local.screener,
        screenerSession: createDefaultScreenerSession(local.screener),
        remoteApplied: false,
        remotePending: false,
      });
    } catch {
      hydratedRef.current = true;
      setHydrated(true);
    }
  }, [applyBootstrapResult, binding]);

  useEffect(() => {
    let cancelled = false;
    void resolveAppBootstrap({ chartTileBinding: binding })
      .then((result) => {
        if (cancelled) return;
        try {
          applyBootstrapResult(result);
        } catch {
          if (!cancelled) {
            hydrateFromLocalFallback();
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          hydrateFromLocalFallback();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [applyBootstrapResult, binding, hydrateFromLocalFallback]);

  const handleApplyWorkspaceTabs = useCallback(
    (incoming: WorkspaceTabsState, applyOptions?: ApplyWorkspaceTabsOptions) => {
      setWorkspaceTabs((current) => {
        const next = pruneToSingleActiveTab(
          mergeWorkspaceTabsApply(current, incoming, applyOptions),
        );
        syncCellLayoutStoreFromLayout(getActiveLayout(next));
        workspaceTabsRef.current = next;
        saveWorkspaceTabs(next, storageBinding);
        return next;
      });
    },
    [storageBinding],
  );

  const finishRemoteWorkspaceMerge = useCallback(async () => {
    const finish = finishRemoteWorkspaceMergeRef.current;
    if (!finish) return null;
    return finish();
  }, []);

  const handleRemoteResourceCreated = useCallback((resourceId: string) => {
    onChartWorkspaceIdCreatedRef.current?.(resourceId);
  }, []);

  const { flushActiveTabSave } = useWorkspaceTabsRemoteSync({
    workspaceTabs,
    hydrated,
    bootstrapRemoteApplied,
    bootstrapRemotePending,
    finishRemoteWorkspaceMerge: bootstrapRemotePending ? finishRemoteWorkspaceMerge : undefined,
    onApplyWorkspaceTabs: handleApplyWorkspaceTabs,
    onRemoteResourceCreated: handleRemoteResourceCreated,
  });

  useEffect(() => {
    flushActiveTabSaveRef.current = flushActiveTabSave;
  }, [flushActiveTabSave]);

  useChartTemplateLibraryRemoteSync();

  useEffect(() => {
    return registerCellLayoutFlushHandler(() => {
      setWorkspaceTabs((prev) => {
        const currentLayout = getActiveLayout(prev);
        const count = cellCountFor(currentLayout.layoutId);
        const mergedCells = collectLayoutCells(count);
        return updateActiveTabLayout(prev, { ...currentLayout, cells: mergedCells });
      });
    });
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const t = setTimeout(() => saveWorkspaceTabs(workspaceTabs, storageBinding), 500);
    return () => clearTimeout(t);
  }, [workspaceTabs, storageBinding]);

  return {
    workspaceTabs,
    setWorkspaceTabs,
    layout,
    activeTab,
    setLayout,
    hydrated,
    hydratedRef,
    watchlistBootstrap,
    screenerBootstrap,
    screenerSessionBootstrap,
  };
}
