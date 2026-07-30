import "server-only";

import { isDatabaseConfigured } from "@/db";
import { DEFAULT_RISK_SETTINGS, type RiskSettings } from "@/lib/risk/riskSettings";

/** Server-side risk settings for trading gates — Postgres prefs when configured. */
export async function resolveServerRiskSettings(): Promise<RiskSettings> {
  if (!isDatabaseConfigured()) {
    return DEFAULT_RISK_SETTINGS;
  }
  try {
    const { ensureDevAppUser } = await import(
      "@/lib/persistence/repositories/appUserRepository"
    );
    const { getUserPreferencesLibrary } = await import(
      "@/lib/persistence/repositories/userPreferencesRepository"
    );
    const userId = await ensureDevAppUser();
    const record = await getUserPreferencesLibrary(userId);
    return record?.preferencesSnapshot.riskSettings ?? DEFAULT_RISK_SETTINGS;
  } catch {
    return DEFAULT_RISK_SETTINGS;
  }
}
