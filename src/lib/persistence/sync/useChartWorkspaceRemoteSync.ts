"use client";

import { useCallback, useEffect, useRef } from "react";

import type { ChartLayout } from "@/lib/chartConfig";
import {
  fetchDefaultChartWorkspace,
  saveChartWorkspaceRemote,
} from "@/lib/persistence/client/chartWorkspaceClient";
import {
  getChartWorkspaceSyncMetadata,
  isRemoteNewer,
  setChartWorkspaceSyncMetadata,
} from "@/lib/persistence/sync/syncMetadata";

export function useChartWorkspaceRemoteSync(options: {
  layout: ChartLayout;
  hydrated: boolean;
  bootstrapRemoteApplied?: boolean;
  bootstrapRemotePending?: boolean;
  finishRemoteLayout?: () => Promise<ChartLayout | null>;
  onApplyRemoteLayout: (layout: ChartLayout) => void;
}): void {
  const layoutRef = useRef(options.layout);
  const syncingRef = useRef(false);
  const remoteHydratedRef = useRef(false);
  const pendingRemoteStartedRef = useRef(false);

  layoutRef.current = options.layout;

  const applyRemoteIfNewer = useCallback(async () => {
    const remote = await fetchDefaultChartWorkspace();
    if (!remote) {
      remoteHydratedRef.current = true;
      return;
    }

    const localMeta = getChartWorkspaceSyncMetadata();
    if (!localMeta) {
      setChartWorkspaceSyncMetadata({
        resourceId: remote.id,
        syncRevision: remote.syncRevision,
        updatedAt: remote.updatedAt,
      });
      if (JSON.stringify(remote.chartLayoutSnapshot) !== JSON.stringify(layoutRef.current)) {
        options.onApplyRemoteLayout(remote.chartLayoutSnapshot as ChartLayout);
      }
      remoteHydratedRef.current = true;
      return;
    }

    if (
      isRemoteNewer(localMeta, remote.updatedAt, remote.syncRevision) &&
      JSON.stringify(remote.chartLayoutSnapshot) !== JSON.stringify(layoutRef.current)
    ) {
      setChartWorkspaceSyncMetadata({
        resourceId: remote.id,
        syncRevision: remote.syncRevision,
        updatedAt: remote.updatedAt,
      });
      options.onApplyRemoteLayout(remote.chartLayoutSnapshot as ChartLayout);
    }

    remoteHydratedRef.current = true;
  }, [options.onApplyRemoteLayout]);

  useEffect(() => {
    if (!options.hydrated || remoteHydratedRef.current) return;

    if (options.bootstrapRemoteApplied) {
      remoteHydratedRef.current = true;
      return;
    }

    if (options.bootstrapRemotePending && options.finishRemoteLayout) {
      if (pendingRemoteStartedRef.current) return;
      pendingRemoteStartedRef.current = true;
      void options.finishRemoteLayout().then((layout) => {
        if (layout) {
          options.onApplyRemoteLayout(layout);
        }
        remoteHydratedRef.current = true;
      });
      return;
    }

    void applyRemoteIfNewer();
  }, [
    options.hydrated,
    options.bootstrapRemoteApplied,
    options.bootstrapRemotePending,
    options.finishRemoteLayout,
    applyRemoteIfNewer,
    options.onApplyRemoteLayout,
  ]);

  useEffect(() => {
    if (!options.hydrated || !remoteHydratedRef.current) return;

    const timer = window.setTimeout(() => {
      if (syncingRef.current) return;
      syncingRef.current = true;

      void (async () => {
        try {
          let metadata = getChartWorkspaceSyncMetadata();
          if (!metadata?.resourceId) {
            const bootstrap = await fetchDefaultChartWorkspace();
            if (!bootstrap) return;
            metadata = {
              resourceId: bootstrap.id,
              syncRevision: bootstrap.syncRevision,
              updatedAt: bootstrap.updatedAt,
            };
            setChartWorkspaceSyncMetadata(metadata);
          }

          const workspaceId = getChartWorkspaceSyncMetadata()?.resourceId;
          if (!workspaceId) return;

          const result = await saveChartWorkspaceRemote({
            workspaceId,
            baseRevision: getChartWorkspaceSyncMetadata()?.syncRevision ?? 0,
            chartLayoutSnapshot: layoutRef.current,
          });

          if (result.ok) {
            setChartWorkspaceSyncMetadata({
              resourceId: result.record.id,
              syncRevision: result.record.syncRevision,
              updatedAt: result.record.updatedAt,
            });
          } else if (result.current) {
            if (result.current.chartLayoutSnapshot) {
              options.onApplyRemoteLayout(result.current.chartLayoutSnapshot as ChartLayout);
            }
            setChartWorkspaceSyncMetadata({
              resourceId: workspaceId,
              syncRevision: result.current.syncRevision,
              updatedAt: result.current.updatedAt,
            });
          }
        } finally {
          syncingRef.current = false;
        }
      })();
    }, 800);

    return () => window.clearTimeout(timer);
  }, [options.hydrated, options.layout, options.onApplyRemoteLayout]);
}
