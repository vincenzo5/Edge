"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { resolveUserPreferencesBootstrap } from "@/lib/app/bootstrap/resolveUserPreferencesBootstrap";
import { applyUserPreferencesSnapshot } from "@/lib/userPreferences/applyUserPreferencesSnapshot";
import { assembleUserPreferencesSnapshot } from "@/lib/userPreferences/assembleUserPreferencesSnapshot";
import { useUserPreferencesRemoteSync } from "@/lib/persistence/sync/useUserPreferencesRemoteSync";
import type { UserPreferencesSnapshot } from "@/lib/persistence/schemas/userPreferences";
import { subscribeUserPreferencesGeneration } from "@/lib/userPreferences/userPreferencesSync";

export function UserPreferencesSyncProvider({ children }: { children: ReactNode }) {
  const [syncGeneration, setSyncGeneration] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [bootstrapRemoteApplied, setBootstrapRemoteApplied] = useState(false);
  const [bootstrapRemotePending, setBootstrapRemotePending] = useState(false);
  const finishRemoteUserPreferencesMergeRef =
    useRef<(() => Promise<UserPreferencesSnapshot | null>) | undefined>(undefined);

  useEffect(() => subscribeUserPreferencesGeneration(() => setSyncGeneration((g) => g + 1)), []);

  useEffect(() => {
    let cancelled = false;
    const local = assembleUserPreferencesSnapshot();

    void resolveUserPreferencesBootstrap(local)
      .then((result) => {
        if (cancelled) return;
        if (result.remoteApplied) {
          applyUserPreferencesSnapshot(result.snapshot);
          setSyncGeneration((g) => g + 1);
        }
        setBootstrapRemoteApplied(result.remoteApplied);
        setBootstrapRemotePending(result.remotePending);
        finishRemoteUserPreferencesMergeRef.current = result.finishRemoteUserPreferencesMerge;
        setHydrated(true);
      })
      .catch(() => {
        if (cancelled) return;
        setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const snapshot = useMemo(() => assembleUserPreferencesSnapshot(), [syncGeneration]);

  const onApplyRemoteSnapshot = useCallback((remoteSnapshot: UserPreferencesSnapshot) => {
    applyUserPreferencesSnapshot(remoteSnapshot);
    setSyncGeneration((g) => g + 1);
  }, []);

  const finishRemoteUserPreferencesMerge = useCallback(async () => {
    const finish = finishRemoteUserPreferencesMergeRef.current;
    if (!finish) return null;
    return finish();
  }, []);

  useUserPreferencesRemoteSync({
    snapshot,
    hydrated,
    bootstrapRemoteApplied,
    bootstrapRemotePending,
    finishRemoteUserPreferencesMerge: bootstrapRemotePending
      ? finishRemoteUserPreferencesMerge
      : undefined,
    onApplyRemoteSnapshot,
  });

  return children;
}
