"use client";

import { useCallback, useMemo } from "react";

import type { PresetEnvelope } from "@/lib/chart/presets/types";
import { loadPresets, savePresets } from "@/lib/presetStorage";
import { PRESETS_UPDATED_EVENT } from "@/lib/persistence/sync/presetEvents";
import {
  fetchChartTemplateLibrary,
  presetsFromTemplateSnapshot,
  saveChartTemplateLibraryRemote,
  type ChartTemplateLibraryRemoteRecord,
} from "@/lib/persistence/client/chartTemplateLibraryClient";
import {
  getChartTemplateLibrarySyncMetadata,
  setChartTemplateLibrarySyncMetadata,
} from "@/lib/persistence/sync/syncMetadata";
import {
  useRevisionedRemoteSync,
  type RevisionedRemoteSyncAdapter,
} from "@/lib/persistence/sync/useRevisionedRemoteSync";

export function useChartTemplateLibraryRemoteSync(): void {
  const applyRemotePresets = useCallback((presets: PresetEnvelope[]) => {
    savePresets(presets, { notify: false });
  }, []);

  const adapter = useMemo<RevisionedRemoteSyncAdapter<PresetEnvelope[]>>(
    () => ({
      fetchRemote: async () => {
        const remote = await fetchChartTemplateLibrary();
        if (!remote) return null;
        return {
          syncRevision: remote.syncRevision,
          updatedAt: remote.updatedAt,
          snapshot: presetsFromTemplateSnapshot(remote.templateSnapshot),
        };
      },
      saveRemote: async (presets, baseRevision) => {
        const result = await saveChartTemplateLibraryRemote(presets, baseRevision);
        if (result.ok) {
          return {
            ok: true,
            record: {
              syncRevision: result.record.syncRevision,
              updatedAt: result.record.updatedAt,
            },
          };
        }
        return {
          ok: false,
          current: result.current
            ? {
                syncRevision: result.current.syncRevision,
                updatedAt: result.current.updatedAt,
                snapshot: result.current.templateSnapshot
                  ? presetsFromTemplateSnapshot(result.current.templateSnapshot)
                  : undefined,
              }
            : undefined,
        };
      },
      getMeta: getChartTemplateLibrarySyncMetadata,
      setMeta: setChartTemplateLibrarySyncMetadata,
    }),
    [],
  );

  const getState = useCallback(() => loadPresets(), []);

  const subscribe = useCallback((onChange: () => void) => {
    const onPresetsUpdated = () => onChange();
    window.addEventListener(PRESETS_UPDATED_EVENT, onPresetsUpdated);
    return () => window.removeEventListener(PRESETS_UPDATED_EVENT, onPresetsUpdated);
  }, []);

  useRevisionedRemoteSync({
    adapter,
    getState,
    subscribe,
    onApplyRemoteState: applyRemotePresets,
  });
}

export type { ChartTemplateLibraryRemoteRecord };
