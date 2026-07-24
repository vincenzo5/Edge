"use client";

import { useCallback, useEffect, useState } from "react";

import { SEED_CONNECTIONS } from "./seedConnections";
import type { Connection, PatchConnectionInput } from "./types";

export type ConnectionsListSource = "remote" | "seed";

type ConnectionsListState = {
  connections: Connection[];
  source: ConnectionsListSource;
  loading: boolean;
  error: string | null;
};

async function fetchConnections(): Promise<{
  connections: Connection[];
  source: ConnectionsListSource;
}> {
  const res = await fetch("/api/me/connections", { credentials: "include" });
  if (res.status === 503) {
    return { connections: SEED_CONNECTIONS, source: "seed" };
  }
  if (!res.ok) {
    throw new Error(`Failed to load connections (${res.status})`);
  }
  const json = (await res.json()) as { connections?: Connection[] };
  return {
    connections: json.connections ?? SEED_CONNECTIONS,
    source: "remote",
  };
}

export async function patchConnectionClient(
  connectionId: string,
  patch: PatchConnectionInput,
): Promise<Connection | null> {
  const res = await fetch(`/api/me/connections/${encodeURIComponent(connectionId)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (res.status === 503) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Failed to update connection (${res.status})`);
  }
  return (await res.json()) as Connection;
}

export async function reconnectConnectionClient(connectionId: string): Promise<Response> {
  return fetch(`/api/me/connections/${encodeURIComponent(connectionId)}/reconnect`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

export async function disconnectConnectionClient(connectionId: string): Promise<Connection | null> {
  const res = await fetch(`/api/me/connections/${encodeURIComponent(connectionId)}/disconnect`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (res.status === 503) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Failed to disconnect connection (${res.status})`);
  }
  const json = (await res.json()) as { connection?: Connection };
  return json.connection ?? null;
}

export function useConnectionsList(options?: { enabled?: boolean }): ConnectionsListState & {
  refresh: () => Promise<void>;
} {
  const enabled = options?.enabled ?? true;
  const [state, setState] = useState<ConnectionsListState>({
    connections: SEED_CONNECTIONS,
    source: "seed",
    loading: enabled,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await fetchConnections();
      setState({
        connections: result.connections,
        source: result.source,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState({
        connections: SEED_CONNECTIONS,
        source: "seed",
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load connections",
      });
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}

export function resolveConnectionDisplayName(
  connectionId: string,
  connectionsList: Connection[],
): string {
  const match = connectionsList.find((connection) => connection.id === connectionId);
  if (match) return match.displayName;
  const seed = SEED_CONNECTIONS.find((connection) => connection.id === connectionId);
  return seed?.displayName ?? connectionId;
}
