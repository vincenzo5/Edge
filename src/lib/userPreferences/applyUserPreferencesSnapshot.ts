import { writeAppThemePreference } from "@/lib/app/appThemePreference";
import { writeAppPalettePreference } from "@/lib/app/appPalettePreference";
import { writeAppTimeZonePreference } from "@/lib/app/appTimeZonePreference";
import { ensureLiveDataConnectionPreference } from "@/lib/marketData/dataConnectionPreference";
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
import { runApplyingRemoteUserPreferences } from "@/lib/userPreferences/userPreferencesSync";

function applyDataConnectionPreference(): void {
  if (typeof window === "undefined") return;
  ensureLiveDataConnectionPreference();
}

export function applyUserPreferencesSnapshot(snapshot: UserPreferencesSnapshot): void {
  runApplyingRemoteUserPreferences(() => {
    writeAppThemePreference(snapshot.theme);
    writeAppPalettePreference(snapshot.palette);
    writeAppTimeZonePreference(snapshot.timeZone);
    applyDataConnectionPreference();
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
