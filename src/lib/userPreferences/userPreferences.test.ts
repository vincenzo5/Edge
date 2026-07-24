import { beforeEach, describe, expect, it } from "vitest";

import { APP_THEME_PREFERENCE_KEY } from "@/lib/app/appThemePreference";
import { APP_PALETTE_PREFERENCE_KEY } from "@/lib/app/appPalettePreference";
import { APP_TIMEZONE_PREFERENCE_KEY } from "@/lib/app/appTimeZonePreference";
import {
  DATA_CONNECTION_PREFERENCE_EXPLICIT_KEY,
  DATA_CONNECTION_PREFERENCE_KEY,
} from "@/lib/marketData/dataConnectionPreference";
import { DATA_PROVIDER_PREFERENCE_KEY } from "@/lib/marketData/dataProviderPreference";
import { createDefaultDataProviderPreference } from "@/lib/marketData/providerWaterfall";
import { JOURNAL_TRADES_TABLE_STORAGE_KEY } from "@/lib/journal/journalTradesTableControls";
import { DEFAULT_RISK_SETTINGS, RISK_SETTINGS_STORAGE_KEY } from "@/lib/risk/riskSettings";
import { ACCOUNT_ALIASES_STORAGE_KEY } from "@/lib/trading/accountAliases";
import { ACTIVE_TRADING_ACCOUNT_KEY } from "@/lib/trading/activeAccount";
import { IB_PAPER_CONNECTION_ID } from "@/lib/trading/connectionRegistry";
import { TRADING_ENVIRONMENT_KEY } from "@/lib/trading/tradingEnvironment";
import {
  assembleUserPreferencesSnapshot,
  createDefaultUserPreferencesSnapshot,
} from "@/lib/userPreferences/assembleUserPreferencesSnapshot";
import { applyUserPreferencesSnapshot } from "@/lib/userPreferences/applyUserPreferencesSnapshot";
import {
  getUserPreferencesGeneration,
  notifyUserPreferencesChanged,
  resetUserPreferencesSyncStateForTests,
} from "@/lib/userPreferences/userPreferencesSync";

describe("assembleUserPreferencesSnapshot", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("assembles client defaults when local keys are empty", () => {
    const snapshot = assembleUserPreferencesSnapshot();
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.theme).toBe("dark");
    expect(snapshot.palette).toBe("midnight");
    expect(snapshot.dataConnectionId).toBeNull();
    expect(snapshot.dataConnectionExplicit).toBe(false);
    expect(snapshot.dataProviderPreference).toEqual(createDefaultDataProviderPreference());
    expect(snapshot.tradingEnvironment).toBe("paper");
    expect(snapshot.activeAccount).toBeNull();
    expect(snapshot.timeZone.length).toBeGreaterThan(0);
  });

  it("reads persisted local keys into the pack", () => {
    localStorage.setItem(APP_THEME_PREFERENCE_KEY, "light");
    localStorage.setItem(APP_PALETTE_PREFERENCE_KEY, "graphite");
    localStorage.setItem(APP_TIMEZONE_PREFERENCE_KEY, "Europe/London");
    localStorage.setItem(DATA_CONNECTION_PREFERENCE_KEY, IB_PAPER_CONNECTION_ID);
    localStorage.setItem(DATA_CONNECTION_PREFERENCE_EXPLICIT_KEY, "1");
    localStorage.setItem(TRADING_ENVIRONMENT_KEY, "live");
    localStorage.setItem(RISK_SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_RISK_SETTINGS));
    localStorage.setItem(
      JOURNAL_TRADES_TABLE_STORAGE_KEY,
      JSON.stringify({
        visibleColumns: ["symbol"],
        columnOrder: ["symbol"],
        pageSize: 25,
      }),
    );

    const snapshot = assembleUserPreferencesSnapshot();
    expect(snapshot.theme).toBe("light");
    expect(snapshot.palette).toBe("graphite");
    expect(snapshot.timeZone).toBe("Europe/London");
    expect(snapshot.dataConnectionExplicit).toBe(true);
    expect(snapshot.tradingEnvironment).toBe("live");
    expect(snapshot.journalTradesTablePrefs.pageSize).toBe(25);
  });
});

describe("applyUserPreferencesSnapshot", () => {
  beforeEach(() => {
    localStorage.clear();
    resetUserPreferencesSyncStateForTests();
  });

  it("writes all local source keys without bumping sync generation", () => {
    const remote = {
      ...createDefaultUserPreferencesSnapshot(),
      theme: "light" as const,
      palette: "slate" as const,
      timeZone: "Europe/London",
      dataConnectionExplicit: true,
      dataConnectionId: IB_PAPER_CONNECTION_ID,
      tradingEnvironment: "live" as const,
      accountAliases: { "ib-paper:DU123": "Desk" },
      activeAccount: {
        broker: "ib" as const,
        connectionId: IB_PAPER_CONNECTION_ID,
        accountId: "DU123",
        environment: "paper" as const,
      },
    };

    applyUserPreferencesSnapshot(remote);

    expect(localStorage.getItem(APP_THEME_PREFERENCE_KEY)).toBe("light");
    expect(localStorage.getItem(APP_PALETTE_PREFERENCE_KEY)).toBe("slate");
    expect(localStorage.getItem(APP_TIMEZONE_PREFERENCE_KEY)).toBe("Europe/London");
    expect(localStorage.getItem(DATA_CONNECTION_PREFERENCE_EXPLICIT_KEY)).toBe("1");
    expect(localStorage.getItem(TRADING_ENVIRONMENT_KEY)).toBe("live");
    expect(localStorage.getItem(ACCOUNT_ALIASES_STORAGE_KEY)).toContain("Desk");
    expect(localStorage.getItem(ACTIVE_TRADING_ACCOUNT_KEY)).toContain("DU123");
    expect(getUserPreferencesGeneration()).toBe(0);
  });

  it("allows local writes to notify after remote apply completes", () => {
    applyUserPreferencesSnapshot(createDefaultUserPreferencesSnapshot());
    notifyUserPreferencesChanged();
    expect(getUserPreferencesGeneration()).toBe(1);
  });
});
