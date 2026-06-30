export type SyncMetadata = {
  resourceId?: string;
  syncRevision: number;
  updatedAt: string;
};

const KEYS = {
  chartWorkspace: "tv-ai:sync:chart-workspace:v1",
  watchlistLibrary: "tv-ai:sync:watchlist-library:v1",
  chartTemplateLibrary: "tv-ai:sync:chart-template-library:v1",
  screenerLibrary: "tv-ai:sync:screener-library:v1",
} as const;

function readMetadata(key: string): SyncMetadata | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SyncMetadata;
    if (typeof parsed.syncRevision !== "number" || typeof parsed.updatedAt !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeMetadata(key: string, metadata: SyncMetadata): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(metadata));
  } catch {
    // ignore quota errors
  }
}

export function getChartWorkspaceSyncMetadata(): SyncMetadata | null {
  return readMetadata(KEYS.chartWorkspace);
}

export function setChartWorkspaceSyncMetadata(metadata: SyncMetadata): void {
  writeMetadata(KEYS.chartWorkspace, metadata);
}

export function getWatchlistLibrarySyncMetadata(): SyncMetadata | null {
  return readMetadata(KEYS.watchlistLibrary);
}

export function setWatchlistLibrarySyncMetadata(metadata: SyncMetadata): void {
  writeMetadata(KEYS.watchlistLibrary, metadata);
}

export function getChartTemplateLibrarySyncMetadata(): SyncMetadata | null {
  return readMetadata(KEYS.chartTemplateLibrary);
}

export function setChartTemplateLibrarySyncMetadata(metadata: SyncMetadata): void {
  writeMetadata(KEYS.chartTemplateLibrary, metadata);
}

export function getScreenerLibrarySyncMetadata(): SyncMetadata | null {
  return readMetadata(KEYS.screenerLibrary);
}

export function setScreenerLibrarySyncMetadata(metadata: SyncMetadata): void {
  writeMetadata(KEYS.screenerLibrary, metadata);
}

export function isRemoteNewer(
  local: SyncMetadata | null,
  remoteUpdatedAt: string,
  remoteRevision: number,
): boolean {
  if (!local) return true;
  if (remoteRevision > local.syncRevision) return true;
  if (remoteRevision < local.syncRevision) return false;
  return Date.parse(remoteUpdatedAt) > Date.parse(local.updatedAt);
}
