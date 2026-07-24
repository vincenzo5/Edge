import { writeAppThemePreference } from "@/lib/app/appThemePreference";
import { writeAppPalettePreference } from "@/lib/app/appPalettePreference";
import { writeAppTimeZonePreference } from "@/lib/app/appTimeZonePreference";
import {
  DATA_CONNECTION_PREFERENCE_EXPLICIT_KEY,
  type DataConnectionId,
  writeDataConnectionPreference,
  writeExplicitDataConnectionPreference,
} from "@/lib/marketData/dataConnectionPreference";
import { writeDataProviderPreference } from "@/lib/marketData/dataProviderPreference";
import { writeJournalTradesTablePrefs } from "@/lib/journal/journalTradesTableControls";
import type { UserPreferencesSnapshot } from "@/lib/persistence/schemas/userPreferences";
import { saveRiskSettingsToStorage } from "@/lib/risk/riskSettings";
import { writeAccountAliases } from "@/lib/trading/accountAliases";
import {
  clearActiveTradingAccount,
  writeActiveTradingAccount,
} from "@/lib/trading/activeAccount";
import { writeTradingEnvironment } from "@/lib/trading/tradingEnvironment";
import { IB_LIVE_CONNECTION_ID, IB_PAPER_CONNECTION_ID } from "@/lib/trading/connectionRegistry";
import { runApplyingRemoteUserPreferences } from "@/lib/userPreferences/userPreferencesSync";

const VALID_DATA_CONNECTION_IDS = new Set<DataConnectionId>([
  IB_PAPER_CONNECTION_ID,
  IB_LIVE_CONNECTION_ID,
]);

function toDataConnectionId(value: string | null): DataConnectionId | null {
  if (value == null) return null;
  return VALID_DATA_CONNECTION_IDS.has(value as DataConnectionId)
    ? (value as DataConnectionId)
    : null;
}

function applyDataConnectionPreference(snapshot: UserPreferencesSnapshot): void {
  if (typeof window === "undefined") return;

  const connectionId = toDataConnectionId(snapshot.dataConnectionId);
  if (snapshot.dataConnectionExplicit && connectionId) {
    writeExplicitDataConnectionPreference(connectionId);
    return;
  }

  if (connectionId) {
    writeDataConnectionPreference(connectionId);
  }

  try {
    window.localStorage.removeItem(DATA_CONNECTION_PREFERENCE_EXPLICIT_KEY);
  } catch {
    // ignore quota / privacy mode failures
  }
}

export function applyUserPreferencesSnapshot(snapshot: UserPreferencesSnapshot): void {
  runApplyingRemoteUserPreferences(() => {
    writeAppThemePreference(snapshot.theme);
    writeAppPalettePreference(snapshot.palette);
    writeAppTimeZonePreference(snapshot.timeZone);
    applyDataConnectionPreference(snapshot);
    writeTradingEnvironment(snapshot.tradingEnvironment);

    if (snapshot.activeAccount) {
      writeActiveTradingAccount(snapshot.activeAccount);
    } else {
      clearActiveTradingAccount();
    }

    writeAccountAliases(snapshot.accountAliases);
    saveRiskSettingsToStorage(snapshot.riskSettings);
    writeJournalTradesTablePrefs(snapshot.journalTradesTablePrefs);
    writeDataProviderPreference(snapshot.dataProviderPreference);
  });
}
