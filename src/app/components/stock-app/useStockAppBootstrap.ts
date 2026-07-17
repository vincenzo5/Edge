"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyThemeToRoot } from "@/lib/chartConfig";
import { saveWorkspaceTabs } from "@/lib/app/workspaceTabsStorage";
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
import type { WatchlistState } from "@/lib/watchlist/types";
import type { ScreenerState } from "@/lib/screener/types";
import type { ScreenerSessionState } from "@/lib/screener/screenerSession";
import { createDefaultScreenerSession } from "@/lib/screener/screenerSession";
import { useChartTemplateLibraryRemoteSync } from "@/lib/persistence/sync/useChartTemplateLibraryRemoteSync";
import { useWorkspaceTabsRemoteSync } from "@/lib/persistence/sync/useWorkspaceTabsRemoteSync";
import type { ChartLayout } from "@/lib/chartConfig";

export function useStockAppBootstrap() {
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
      setWorkspaceTabs((prev) => updateActiveTabLayout(prev, updater));
    },
    [],
  );

  const applyBootstrapResult = useCallback((result: AppBootstrapResult) => {
    const prunedTabs = pruneToSingleActiveTab(result.workspaceTabs);
    workspaceTabsRef.current = prunedTabs;
    setWorkspaceTabs(prunedTabs);
    saveWorkspaceTabs(prunedTabs);
    setWatchlistBootstrap(result.watchlist);
    setScreenerBootstrap(result.screener);
    setScreenerSessionBootstrap(result.screenerSession);
    setBootstrapRemoteApplied(result.remoteApplied);
    setBootstrapRemotePending(result.remotePending);
    finishRemoteWorkspaceMergeRef.current = result.finishRemoteWorkspaceMerge;
    applyThemeToRoot(getActiveLayout(prunedTabs).theme);
    hydratedRef.current = true;
    setHydrated(true);
  }, []);

  const hydrateFromLocalFallback = useCallback(() => {
    try {
      const local = loadLocalAppState();
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
  }, [applyBootstrapResult]);

  useEffect(() => {
    let cancelled = false;
    void resolveAppBootstrap()
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
  }, [applyBootstrapResult, hydrateFromLocalFallback]);

  const handleApplyWorkspaceTabs = useCallback(
    (incoming: WorkspaceTabsState, applyOptions?: ApplyWorkspaceTabsOptions) => {
      setWorkspaceTabs((current) => {
        const next = pruneToSingleActiveTab(
          mergeWorkspaceTabsApply(current, incoming, applyOptions),
        );
        workspaceTabsRef.current = next;
        saveWorkspaceTabs(next);
        return next;
      });
    },
    [],
  );

  const finishRemoteWorkspaceMerge = useCallback(async () => {
    const finish = finishRemoteWorkspaceMergeRef.current;
    if (!finish) return null;
    return finish();
  }, []);

  const { flushActiveTabSave } = useWorkspaceTabsRemoteSync({
    workspaceTabs,
    hydrated,
    bootstrapRemoteApplied,
    bootstrapRemotePending,
    finishRemoteWorkspaceMerge: bootstrapRemotePending ? finishRemoteWorkspaceMerge : undefined,
    onApplyWorkspaceTabs: handleApplyWorkspaceTabs,
  });

  useEffect(() => {
    flushActiveTabSaveRef.current = flushActiveTabSave;
  }, [flushActiveTabSave]);

  useChartTemplateLibraryRemoteSync();

  useEffect(() => {
    if (!hydratedRef.current) return;
    applyThemeToRoot(layout.theme);
  }, [layout.theme, hydrated]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const t = setTimeout(() => saveWorkspaceTabs(workspaceTabs), 500);
    return () => clearTimeout(t);
  }, [workspaceTabs]);

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
