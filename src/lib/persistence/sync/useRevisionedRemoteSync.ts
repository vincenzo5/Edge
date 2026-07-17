"use client";

import { useCallback, useEffect, useRef } from "react";

import { isRemoteNewer } from "@/lib/persistence/sync/syncMetadata";

export type SyncMeta = {
  syncRevision: number;
  updatedAt: string;
};

export type RevisionedRemoteSyncAdapter<TState> = {
  fetchRemote: () => Promise<(SyncMeta & { snapshot: TState }) | null>;
  saveRemote: (
    state: TState,
    baseRevision: number,
  ) => Promise<
    | { ok: true; record: SyncMeta }
    | { ok: false; current?: SyncMeta & { snapshot?: TState } }
  >;
  getMeta: () => SyncMeta | null;
  setMeta: (meta: SyncMeta) => void;
  isEqual?: (a: TState, b: TState) => boolean;
  debounceMs?: number;
};

type ReactStateSyncOptions<TState> = {
  adapter: RevisionedRemoteSyncAdapter<TState>;
  state: TState;
  hydrated: boolean;
  onApplyRemoteState: (state: TState) => void;
};

type SubscribeSyncOptions<TState> = {
  adapter: RevisionedRemoteSyncAdapter<TState>;
  getState: () => TState;
  subscribe: (onChange: () => void) => () => void;
  onApplyRemoteState: (state: TState) => void;
  cancelHydrateOnUnmount?: boolean;
};

function defaultIsEqual<TState>(a: TState, b: TState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function applyRemoteIfChanged<TState>(
  remoteSnapshot: TState,
  localState: TState,
  isEqual: (a: TState, b: TState) => boolean,
  onApplyRemoteState: (state: TState) => void,
): void {
  if (!isEqual(remoteSnapshot, localState)) {
    onApplyRemoteState(remoteSnapshot);
  }
}

async function hydrateFromRemote<TState>(options: {
  adapter: RevisionedRemoteSyncAdapter<TState>;
  getLocalState: () => TState;
  onApplyRemoteState: (state: TState) => void;
}): Promise<void> {
  const { adapter, getLocalState, onApplyRemoteState } = options;
  const isEqual = adapter.isEqual ?? defaultIsEqual;
  const remote = await adapter.fetchRemote();
  if (!remote) return;

  const localMeta = adapter.getMeta();
  const localState = getLocalState();

  if (!localMeta) {
    applyRemoteIfChanged(remote.snapshot, localState, isEqual, onApplyRemoteState);
    adapter.setMeta({
      syncRevision: remote.syncRevision,
      updatedAt: remote.updatedAt,
    });
    return;
  }

  if (
    isRemoteNewer(localMeta, remote.updatedAt, remote.syncRevision) &&
    !isEqual(remote.snapshot, localState)
  ) {
    onApplyRemoteState(remote.snapshot);
    adapter.setMeta({
      syncRevision: remote.syncRevision,
      updatedAt: remote.updatedAt,
    });
  }
}

async function pushLocalState<TState>(options: {
  adapter: RevisionedRemoteSyncAdapter<TState>;
  getLocalState: () => TState;
  onApplyRemoteState: (state: TState) => void;
}): Promise<void> {
  const { adapter, getLocalState, onApplyRemoteState } = options;
  const state = getLocalState();
  const baseRevision = adapter.getMeta()?.syncRevision ?? 0;
  const result = await adapter.saveRemote(state, baseRevision);

  if (result.ok) {
    adapter.setMeta({
      syncRevision: result.record.syncRevision,
      updatedAt: result.record.updatedAt,
    });
    return;
  }

  if (result.current) {
    if (result.current.snapshot) {
      onApplyRemoteState(result.current.snapshot);
    }
    adapter.setMeta({
      syncRevision: result.current.syncRevision,
      updatedAt: result.current.updatedAt,
    });
  }
}

export function useRevisionedRemoteSync<TState>(
  options: ReactStateSyncOptions<TState>,
): void;
export function useRevisionedRemoteSync<TState>(
  options: SubscribeSyncOptions<TState>,
): void;
export function useRevisionedRemoteSync<TState>(
  options: ReactStateSyncOptions<TState> | SubscribeSyncOptions<TState>,
): void {
  if ("state" in options) {
    useRevisionedRemoteSyncReactState(options);
    return;
  }
  useRevisionedRemoteSyncSubscribe(options);
}

function useRevisionedRemoteSyncReactState<TState>(
  options: ReactStateSyncOptions<TState>,
): void {
  const { adapter, hydrated, onApplyRemoteState } = options;
  const stateRef = useRef(options.state);
  const syncingRef = useRef(false);
  const remoteHydratedRef = useRef(false);
  const debounceMs = adapter.debounceMs ?? 600;

  stateRef.current = options.state;

  const applyRemoteIfNewer = useCallback(async () => {
    await hydrateFromRemote({
      adapter,
      getLocalState: () => stateRef.current,
      onApplyRemoteState,
    });
    remoteHydratedRef.current = true;
  }, [adapter, onApplyRemoteState]);

  useEffect(() => {
    if (!hydrated || remoteHydratedRef.current) return;
    void applyRemoteIfNewer();
  }, [hydrated, applyRemoteIfNewer]);

  useEffect(() => {
    if (!hydrated || !remoteHydratedRef.current) return;

    const timer = window.setTimeout(() => {
      if (syncingRef.current) return;
      syncingRef.current = true;

      void (async () => {
        try {
          await pushLocalState({
            adapter,
            getLocalState: () => stateRef.current,
            onApplyRemoteState,
          });
        } finally {
          syncingRef.current = false;
        }
      })();
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [adapter, debounceMs, hydrated, options.state, onApplyRemoteState]);
}

function useRevisionedRemoteSyncSubscribe<TState>(
  options: SubscribeSyncOptions<TState>,
): void {
  const { adapter, getState, subscribe, onApplyRemoteState, cancelHydrateOnUnmount = true } =
    options;
  const hydratedRef = useRef(false);
  const syncingRef = useRef(false);
  const debounceMs = adapter.debounceMs ?? 600;

  useEffect(() => {
    if (hydratedRef.current) return;

    let cancelled = false;

    void (async () => {
      await hydrateFromRemote({
        adapter,
        getLocalState: getState,
        onApplyRemoteState,
      });
      if (cancelHydrateOnUnmount && cancelled) return;
      hydratedRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [adapter, cancelHydrateOnUnmount, getState, onApplyRemoteState]);

  useEffect(() => {
    const syncLocalState = () => {
      if (!hydratedRef.current || syncingRef.current) return;

      syncingRef.current = true;
      void (async () => {
        try {
          await pushLocalState({
            adapter,
            getLocalState: getState,
            onApplyRemoteState,
          });
        } finally {
          syncingRef.current = false;
        }
      })();
    };

    const onExternalChange = () => {
      window.setTimeout(syncLocalState, debounceMs);
    };

    return subscribe(onExternalChange);
  }, [adapter, debounceMs, getState, onApplyRemoteState, subscribe]);
}
