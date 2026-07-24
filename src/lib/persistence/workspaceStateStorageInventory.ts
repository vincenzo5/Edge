/**
 * Phase 0 inventory — programmatic mirror of the keys ownership map in
 * src/lib/persistence/ARCHITECTURE.md. Used by inventory lock tests only.
 */

export type WorkspaceStatePersistencePhase =
  | "baseline"
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5";

export type StorageKeyInventoryEntry = {
  key: string;
  owner: string;
  phase: WorkspaceStatePersistencePhase;
  postgres: boolean;
  notes?: string;
};

/** Authoritative inventory for workspace-state persistence track. */
export const WORKSPACE_STATE_STORAGE_INVENTORY: StorageKeyInventoryEntry[] = [
  // App workspace shell
  {
    key: "tv-ai:app-workspaces:v1",
    owner: "src/lib/appWorkspace/storage.ts",
    phase: "2",
    postgres: true,
    notes: "Shell sync via /api/me/app-workspaces",
  },
  // Chart workspace tabs (global today; Phase 1 scopes per tile)
  {
    key: "tv-ai:workspace-tabs:v1",
    owner: "src/lib/app/workspaceTabsStorage.ts",
    phase: "1",
    postgres: false,
    notes: "Legacy global key; Phase 1 primary tile only",
  },
  {
    key: "tv-ai:workspace-tabs:v1:tile:{tileId}",
    owner: "src/lib/app/workspaceTabsStorage.ts",
    phase: "1",
    postgres: false,
    notes: "Per-tile scoped key for non-primary chart tiles",
  },
  {
    key: "tv-ai:workspace-tabs:dismissed-remotes:v1",
    owner: "src/lib/app/workspaceTabsStorage.ts",
    phase: "1",
    postgres: false,
  },
  {
    key: "tv-ai:layout:v1",
    owner: "src/lib/layoutStorage.ts",
    phase: "baseline",
    postgres: false,
    notes: "Legacy migrate-on-load only; writes forbidden in production",
  },
  // Sync metadata
  {
    key: "tv-ai:sync:chart-workspace:v1",
    owner: "src/lib/persistence/sync/syncMetadata.ts",
    phase: "1",
    postgres: false,
    notes: "Legacy meta; tabs embed remote on tab",
  },
  {
    key: "tv-ai:sync:app-workspaces:v1",
    owner: "src/lib/persistence/sync/syncMetadata.ts",
    phase: "2",
    postgres: true,
  },
  {
    key: "tv-ai:sync:user-preferences:v1",
    owner: "src/lib/persistence/sync/syncMetadata.ts",
    phase: "3",
    postgres: true,
  },
  {
    key: "tv-ai:sync:watchlist-library:v1",
    owner: "src/lib/persistence/sync/syncMetadata.ts",
    phase: "baseline",
    postgres: true,
  },
  {
    key: "tv-ai:sync:screener-library:v1",
    owner: "src/lib/persistence/sync/syncMetadata.ts",
    phase: "baseline",
    postgres: true,
  },
  {
    key: "tv-ai:sync:chart-template-library:v1",
    owner: "src/lib/persistence/sync/syncMetadata.ts",
    phase: "baseline",
    postgres: true,
  },
  {
    key: "tv-ai:sync:script-library:v1",
    owner: "src/lib/persistence/sync/syncMetadata.ts",
    phase: "baseline",
    postgres: true,
  },
  // Libraries
  {
    key: "tv-ai:watchlists:v1",
    owner: "src/lib/watchlist/storage.ts",
    phase: "baseline",
    postgres: true,
  },
  {
    key: "tv-ai:screener:v1",
    owner: "src/lib/screener/screenStorage.ts",
    phase: "baseline",
    postgres: true,
    notes: "reviewResume on screener snapshot (Phase 5)",
  },
  {
    key: "tv-ai:presets:v1",
    owner: "src/lib/presetStorage.ts",
    phase: "baseline",
    postgres: true,
  },
  {
    key: "tv-ai:last-module:v1",
    owner: "src/lib/app/lastModule.ts",
    phase: "baseline",
    postgres: false,
  },
  // User preference pack sources (Phase 3)
  {
    key: "edge:app:theme:v1",
    owner: "src/lib/app/appThemePreference.ts",
    phase: "3",
    postgres: true,
    notes: "Local cache for user_preferences pack",
  },
  {
    key: "edge:app:palette:v1",
    owner: "src/lib/app/appPalettePreference.ts",
    phase: "3",
    postgres: true,
  },
  {
    key: "edge:app:timeZone:v1",
    owner: "src/lib/app/appTimeZonePreference.ts",
    phase: "3",
    postgres: true,
  },
  {
    key: "edge:marketData:connectionId",
    owner: "src/lib/marketData/dataConnectionPreference.ts",
    phase: "3",
    postgres: true,
  },
  {
    key: "edge:marketData:connectionId:explicit",
    owner: "src/lib/marketData/dataConnectionPreference.ts",
    phase: "3",
    postgres: true,
  },
  {
    key: "edge:marketData:providerPreference:v1",
    owner: "src/lib/marketData/dataProviderPreference.ts",
    phase: "3",
    postgres: true,
  },
  {
    key: "edge:trading:environment",
    owner: "src/lib/trading/tradingEnvironment.ts",
    phase: "3",
    postgres: true,
  },
  {
    key: "edge:trading:activeAccount",
    owner: "src/lib/trading/activeAccount.ts",
    phase: "3",
    postgres: true,
  },
  {
    key: "edge:trading:accountAliases.v1",
    owner: "src/lib/trading/accountAliases.ts",
    phase: "3",
    postgres: true,
  },
  {
    key: "edge.riskSettings.v1",
    owner: "src/lib/risk/riskSettings.ts",
    phase: "3",
    postgres: true,
    notes: "Synced via user_preferences pack",
  },
  {
    key: "edge.journal.tradesTable.v1",
    owner: "src/lib/journal/journalTradesTableControls.ts",
    phase: "3",
    postgres: true,
  },
  // Other durable edge keys (baseline consumers)
  {
    key: "edge.journal.v1",
    owner: "src/lib/journal/types.ts",
    phase: "baseline",
    postgres: true,
  },
  {
    key: "edge:alerts:v1",
    owner: "src/lib/alerts/localAlertStore.ts",
    phase: "baseline",
    postgres: true,
  },
  {
    key: "edge:notifications:v1",
    owner: "src/lib/notifications/localNotificationStore.ts",
    phase: "baseline",
    postgres: true,
  },
  {
    key: "edge:script-library:v1",
    owner: "src/lib/scriptLibrary/types.ts",
    phase: "baseline",
    postgres: true,
  },
  {
    key: "edge:recent-commands:v1",
    owner: "src/lib/shortcuts/recentCommands.ts",
    phase: "baseline",
    postgres: false,
    notes: "Explicitly out of cloud prefs pack",
  },
  {
    key: "edge:recent-symbols:v1",
    owner: "src/lib/app/recentSymbols.ts",
    phase: "baseline",
    postgres: false,
    notes: "Explicitly out of cloud prefs pack",
  },
  {
    key: "tv-ai:copilot-threads:v1",
    owner: "src/lib/copilot/localCopilotThreadsStore.ts",
    phase: "baseline",
    postgres: true,
    notes: "Copilot thread history; ai-agent Phase 6 via /api/me/copilot-threads",
  },
];

export function inventoryEntryForKey(key: string): StorageKeyInventoryEntry | undefined {
  return WORKSPACE_STATE_STORAGE_INVENTORY.find((entry) => entry.key === key);
}
