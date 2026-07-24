import { describe, expect, it } from "vitest";

import { APP_THEME_PREFERENCE_KEY } from "@/lib/app/appThemePreference";
import { APP_TIMEZONE_PREFERENCE_KEY } from "@/lib/app/appTimeZonePreference";
import {
  DISMISSED_REMOTE_WORKSPACES_KEY,
  WORKSPACE_TABS_STORAGE_KEY,
} from "@/lib/app/workspaceTabsStorage";
import { LAST_MODULE_STORAGE_KEY } from "@/lib/app/lastModule";
import {
  chartTileBindingSketchSchema,
  LEGACY_WORKSPACE_TABS_STORAGE_KEY,
  resolveWorkspaceTabsMigrationKey,
  workspaceTabsStorageKeyForTile,
} from "@/lib/appWorkspace/chartTileBindingSketch";
import { tileInstanceSchema } from "@/lib/appWorkspace/schema";
import { APP_WORKSPACES_STORAGE_KEY } from "@/lib/appWorkspace/storage";
import {
  cellViewportPersistSketchSchema,
  parseViewportPersistSketch,
  VIEWPORT_PERSIST_CLEAR_TRIGGERS,
  viewportPersistSketchSchema,
} from "@/lib/chart/viewportPersistSketch";
import { JOURNAL_TRADES_TABLE_STORAGE_KEY } from "@/lib/journal/journalTradesTableControls";
import { JOURNAL_LOCAL_STORAGE_KEY } from "@/lib/journal/types";
import { DATA_CONNECTION_PREFERENCE_EXPLICIT_KEY, DATA_CONNECTION_PREFERENCE_KEY } from "@/lib/marketData/dataConnectionPreference";
import { DEFAULT_RISK_SETTINGS, RISK_SETTINGS_STORAGE_KEY } from "@/lib/risk/riskSettings";
import {
  parseUserPreferencesSnapshotSketch,
  USER_PREFERENCES_LOCAL_SOURCE_KEYS,
  userPreferencesSnapshotSketchSchema,
} from "@/lib/persistence/schemas/userPreferencesSketch";
import {
  inventoryEntryForKey,
  WORKSPACE_STATE_STORAGE_INVENTORY,
} from "@/lib/persistence/workspaceStateStorageInventory";
import { RECENT_COMMANDS_KEY } from "@/lib/shortcuts/recentCommands";
import { ACCOUNT_ALIASES_STORAGE_KEY } from "@/lib/trading/accountAliases";
import { ACTIVE_TRADING_ACCOUNT_KEY } from "@/lib/trading/activeAccount";
import { TRADING_ENVIRONMENT_KEY } from "@/lib/trading/tradingEnvironment";

describe("workspace state storage inventory", () => {
  it("maps exported preference and shell keys to inventory entries", () => {
    const exportedKeys: Array<{ constant: string; key: string }> = [
      { constant: "APP_WORKSPACES_STORAGE_KEY", key: APP_WORKSPACES_STORAGE_KEY },
      { constant: "WORKSPACE_TABS_STORAGE_KEY", key: WORKSPACE_TABS_STORAGE_KEY },
      { constant: "DISMISSED_REMOTE_WORKSPACES_KEY", key: DISMISSED_REMOTE_WORKSPACES_KEY },
      { constant: "APP_THEME_PREFERENCE_KEY", key: APP_THEME_PREFERENCE_KEY },
      { constant: "APP_TIMEZONE_PREFERENCE_KEY", key: APP_TIMEZONE_PREFERENCE_KEY },
      { constant: "DATA_CONNECTION_PREFERENCE_KEY", key: DATA_CONNECTION_PREFERENCE_KEY },
      { constant: "DATA_CONNECTION_PREFERENCE_EXPLICIT_KEY", key: DATA_CONNECTION_PREFERENCE_EXPLICIT_KEY },
      { constant: "TRADING_ENVIRONMENT_KEY", key: TRADING_ENVIRONMENT_KEY },
      { constant: "ACTIVE_TRADING_ACCOUNT_KEY", key: ACTIVE_TRADING_ACCOUNT_KEY },
      { constant: "ACCOUNT_ALIASES_STORAGE_KEY", key: ACCOUNT_ALIASES_STORAGE_KEY },
      { constant: "RISK_SETTINGS_STORAGE_KEY", key: RISK_SETTINGS_STORAGE_KEY },
      { constant: "JOURNAL_TRADES_TABLE_STORAGE_KEY", key: JOURNAL_TRADES_TABLE_STORAGE_KEY },
      { constant: "JOURNAL_LOCAL_STORAGE_KEY", key: JOURNAL_LOCAL_STORAGE_KEY },
      { constant: "RECENT_COMMANDS_KEY", key: RECENT_COMMANDS_KEY },
      { constant: "LAST_MODULE_STORAGE_KEY", key: LAST_MODULE_STORAGE_KEY },
    ];

    for (const { constant, key } of exportedKeys) {
      const entry = inventoryEntryForKey(key);
      expect(entry, `${constant} missing from WORKSPACE_STATE_STORAGE_INVENTORY`).toBeDefined();
      expect(entry?.key).toBe(key);
    }
  });

  it("has unique inventory keys", () => {
    const keys = WORKSPACE_STATE_STORAGE_INVENTORY.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("chart tile binding sketch", () => {
  it("round-trips optional chartWorkspaceId", () => {
    const fixture = {
      id: "tile-chart-1",
      surfaceId: "chart" as const,
      chartWorkspaceId: "550e8400-e29b-41d4-a716-446655440000",
    };
    expect(chartTileBindingSketchSchema.parse(fixture)).toEqual(fixture);
  });

  it("scopes workspace-tabs keys per tile with legacy primary migration", () => {
    expect(workspaceTabsStorageKeyForTile("tile-a")).toBe(
      "tv-ai:workspace-tabs:v1:tile:tile-a",
    );
    expect(resolveWorkspaceTabsMigrationKey("tile-primary", true)).toBe(
      LEGACY_WORKSPACE_TABS_STORAGE_KEY,
    );
    expect(WORKSPACE_TABS_STORAGE_KEY).toBe(LEGACY_WORKSPACE_TABS_STORAGE_KEY);
    expect(resolveWorkspaceTabsMigrationKey("tile-secondary", false)).toBe(
      "tv-ai:workspace-tabs:v1:tile:tile-secondary",
    );
  });
});

describe("user preferences snapshot sketch", () => {
  it("round-trips a full preferences pack fixture", () => {
    const fixture = {
      schemaVersion: 1 as const,
      theme: "dark" as const,
      timeZone: "America/New_York",
      dataConnectionId: "ib-paper",
      dataConnectionExplicit: true,
      tradingEnvironment: "paper" as const,
      activeAccount: {
        broker: "ib" as const,
        connectionId: "ib-paper",
        accountId: "DU123",
        environment: "paper" as const,
      },
      accountAliases: { "DU123": "Paper desk" },
      riskSettings: DEFAULT_RISK_SETTINGS,
      journalTradesTablePrefs: {
        visibleColumns: ["symbol", "status", "chart"],
        columnOrder: ["symbol", "status", "chart"],
        pageSize: 50,
      },
      dataProviderPreference: {
        orderedProviders: ["tws", "ibkr", "massive", "yahoo"],
        disabledProviders: [],
      },
    };

    const parsed = userPreferencesSnapshotSketchSchema.parse(fixture);
    expect(parseUserPreferencesSnapshotSketch(fixture)).toEqual(parsed);
  });

  it("lists local migration source keys aligned with inventory", () => {
    for (const key of Object.values(USER_PREFERENCES_LOCAL_SOURCE_KEYS)) {
      expect(inventoryEntryForKey(key)?.phase).toBe("3");
    }
  });
});

describe("viewport persist sketch", () => {
  it("round-trips viewport snapshot fields", () => {
    const fixture = {
      startIndex: 10,
      endIndex: 160,
      priceMin: 98.5,
      priceMax: 112.25,
      priceScaleMode: "manual" as const,
    };
    expect(viewportPersistSketchSchema.parse(fixture)).toEqual(fixture);
    expect(parseViewportPersistSketch(fixture)).toEqual(fixture);
  });

  it("allows optional viewport on cell sketch", () => {
    expect(cellViewportPersistSketchSchema.parse({})).toEqual({});
    expect(
      cellViewportPersistSketchSchema.parse({
        viewport: { startIndex: 0, endIndex: 150, priceMin: 1, priceMax: 2 },
      }).viewport,
    ).toBeDefined();
  });

  it("documents clear triggers for Phase 4 guardrails", () => {
    expect(VIEWPORT_PERSIST_CLEAR_TRIGGERS).toContain("reset_chart_view");
    expect(VIEWPORT_PERSIST_CLEAR_TRIGGERS).toContain("interval_change");
  });
});

describe("production TileInstance schema (Phase 1 chart tile binding)", () => {
  it("accepts optional chartWorkspaceId on chart tiles", () => {
    const shape = tileInstanceSchema.shape;
    expect(shape.chartWorkspaceId).toBeDefined();
    expect(
      tileInstanceSchema.safeParse({
        id: "tile-1",
        surfaceId: "chart",
      }).success,
    ).toBe(true);
    expect(
      tileInstanceSchema.safeParse({
        id: "tile-1",
        surfaceId: "chart",
        chartWorkspaceId: "550e8400-e29b-41d4-a716-446655440000",
      }).success,
    ).toBe(true);
  });
});
