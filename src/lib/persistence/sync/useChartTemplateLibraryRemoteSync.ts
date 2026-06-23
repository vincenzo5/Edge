"use client";

import { useCallback, useEffect, useRef } from "react";

import type { PresetEnvelope } from "@/lib/chart/presets/types";
import { loadPresets, savePresets } from "@/lib/presetStorage";
import {
  PRESETS_UPDATED_EVENT,
} from "@/lib/persistence/sync/presetEvents";
import {
  fetchChartTemplateLibrary,
  presetsFromTemplateSnapshot,
  saveChartTemplateLibraryRemote,
  type ChartTemplateLibraryRemoteRecord,
} from "@/lib/persistence/client/chartTemplateLibraryClient";
import {
  getChartTemplateLibrarySyncMetadata,
  isRemoteNewer,
  setChartTemplateLibrarySyncMetadata,
} from "@/lib/persistence/sync/syncMetadata";

export function useChartTemplateLibraryRemoteSync(): void {
  const hydratedRef = useRef(false);
  const syncingRef = useRef(false);

  const applyRemotePresets = useCallback((presets: PresetEnvelope[]) => {
    savePresets(presets, { notify: false });
  }, []);

  useEffect(() => {
    if (hydratedRef.current) return;

    let cancelled = false;

    void (async () => {
      const remote = await fetchChartTemplateLibrary();
      if (cancelled) return;

      hydratedRef.current = true;
      if (!remote) return;

      const localMeta = getChartTemplateLibrarySyncMetadata();
      const localPresets = loadPresets();
      const remotePresets = presetsFromTemplateSnapshot(remote.templateSnapshot);

      if (!localMeta) {
        if (JSON.stringify(localPresets) !== JSON.stringify(remotePresets)) {
          applyRemotePresets(remotePresets);
        }
        setChartTemplateLibrarySyncMetadata({
          syncRevision: remote.syncRevision,
          updatedAt: remote.updatedAt,
        });
        return;
      }

      if (
        isRemoteNewer(localMeta, remote.updatedAt, remote.syncRevision) &&
        JSON.stringify(remotePresets) !== JSON.stringify(localPresets)
      ) {
        applyRemotePresets(remotePresets);
        setChartTemplateLibrarySyncMetadata({
          syncRevision: remote.syncRevision,
          updatedAt: remote.updatedAt,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyRemotePresets]);

  useEffect(() => {
    const syncLocalPresets = () => {
      if (!hydratedRef.current || syncingRef.current) return;

      syncingRef.current = true;
      void (async () => {
        try {
          const presets = loadPresets();
          const baseRevision = getChartTemplateLibrarySyncMetadata()?.syncRevision ?? 0;
          const result = await saveChartTemplateLibraryRemote(presets, baseRevision);
          if (result.ok) {
            setChartTemplateLibrarySyncMetadata({
              syncRevision: result.record.syncRevision,
              updatedAt: result.record.updatedAt,
            });
          } else if (result.current) {
            if (result.current.templateSnapshot) {
              applyRemotePresets(presetsFromTemplateSnapshot(result.current.templateSnapshot));
            }
            setChartTemplateLibrarySyncMetadata({
              syncRevision: result.current.syncRevision,
              updatedAt: result.current.updatedAt,
            });
          }
        } finally {
          syncingRef.current = false;
        }
      })();
    };

    const onPresetsUpdated = () => {
      window.setTimeout(syncLocalPresets, 600);
    };

    window.addEventListener(PRESETS_UPDATED_EVENT, onPresetsUpdated);
    return () => window.removeEventListener(PRESETS_UPDATED_EVENT, onPresetsUpdated);
  }, [applyRemotePresets]);
}

export type { ChartTemplateLibraryRemoteRecord };
