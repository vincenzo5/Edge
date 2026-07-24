import { resolveInitialAppTheme } from "@/lib/app/appThemePreference";
import { resolveInitialAppPalette } from "@/lib/app/appPalettePreference";
import { resolveInitialAppTimeZone } from "@/lib/app/appTimeZonePreference";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import { DEFAULT_PALETTE } from "@/lib/design-system/palettes";
import { DEFAULT_CHART_TIMEZONE } from "@/lib/chart/timeZone";
import {
  defaultJournalTradesTablePrefs,
  readJournalTradesTablePrefs,
} from "@/lib/journal/journalTradesTableControls";
import {
  hasExplicitDataConnectionPreference,
  readDataConnectionPreference,
} from "@/lib/marketData/dataConnectionPreference";
import { readDataProviderPreference } from "@/lib/marketData/dataProviderPreference";
import { createDefaultDataProviderPreference } from "@/lib/marketData/providerWaterfall";
import { IB_PAPER_CONNECTION_ID } from "@/lib/trading/connectionRegistry";
import { SCHEMA_VERSION } from "@/lib/persistence/common";
import type { UserPreferencesSnapshot } from "@/lib/persistence/schemas/userPreferences";
import { DEFAULT_RISK_SETTINGS, loadRiskSettingsFromStorage } from "@/lib/risk/riskSettings";
import { readAccountAliases } from "@/lib/trading/accountAliases";
import { readActiveTradingAccount } from "@/lib/trading/activeAccount";
import { readTradingEnvironment } from "@/lib/trading/tradingEnvironment";

export function createDefaultUserPreferencesSnapshot(): UserPreferencesSnapshot {
  const journalTradesTablePrefs = defaultJournalTradesTablePrefs();
  return {
    schemaVersion: SCHEMA_VERSION,
    theme: DEFAULT_LAYOUT.theme,
    palette: DEFAULT_PALETTE,
    timeZone: DEFAULT_CHART_TIMEZONE,
    dataConnectionId: IB_PAPER_CONNECTION_ID,
    dataConnectionExplicit: false,
    dataProviderPreference: createDefaultDataProviderPreference(),
    tradingEnvironment: "paper",
    activeAccount: null,
    accountAliases: {},
    riskSettings: DEFAULT_RISK_SETTINGS,
    journalTradesTablePrefs: {
      visibleColumns: journalTradesTablePrefs.visibleColumns,
      columnOrder: journalTradesTablePrefs.columnOrder,
      pageSize:
        journalTradesTablePrefs.pageSize === 25 ||
        journalTradesTablePrefs.pageSize === 50 ||
        journalTradesTablePrefs.pageSize === 100
          ? journalTradesTablePrefs.pageSize
          : 50,
    },
  };
}

export function assembleUserPreferencesSnapshot(): UserPreferencesSnapshot {
  const activeStored = readActiveTradingAccount();
  const activeAccount = activeStored
    ? {
        broker: activeStored.broker,
        connectionId: activeStored.connectionId,
        accountId: activeStored.accountId,
        environment: activeStored.environment,
      }
    : null;
  const journalTradesTablePrefs = readJournalTradesTablePrefs();

  return {
    schemaVersion: SCHEMA_VERSION,
    theme: resolveInitialAppTheme(),
    palette: resolveInitialAppPalette(),
    timeZone: resolveInitialAppTimeZone(),
    dataConnectionId: readDataConnectionPreference(),
    dataConnectionExplicit: hasExplicitDataConnectionPreference(),
    dataProviderPreference: readDataProviderPreference(),
    tradingEnvironment: readTradingEnvironment(),
    activeAccount,
    accountAliases: readAccountAliases(),
    riskSettings: loadRiskSettingsFromStorage(),
    journalTradesTablePrefs: {
      visibleColumns: journalTradesTablePrefs.visibleColumns,
      columnOrder: journalTradesTablePrefs.columnOrder,
      pageSize:
        journalTradesTablePrefs.pageSize === 25 ||
        journalTradesTablePrefs.pageSize === 50 ||
        journalTradesTablePrefs.pageSize === 100
          ? journalTradesTablePrefs.pageSize
          : 50,
    },
  };
}
