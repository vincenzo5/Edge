import { clearLocalJournalSnapshot, readLocalJournalSnapshot } from "@/lib/journal/localJournalStore";
import { invalidateJournalPersistenceCache } from "@/lib/persistence/client/persistenceClientCache";

export const JOURNAL_SESSION_USER_STORAGE_KEY = "edge.journal.sessionUserId";

type DevSessionUser = {
  id?: string;
  email?: string;
};

let scopeCheckInFlight: Promise<string | null> | null = null;

/** Clear local journal + TTL cache when the signed-in persistence user changes. */
export async function ensureJournalPersistenceUserScope(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (scopeCheckInFlight) return scopeCheckInFlight;

  scopeCheckInFlight = (async () => {
    try {
      const response = await fetch("/api/auth/dev-session", { cache: "no-store" });
      if (!response.ok) return null;

      const body = (await response.json()) as { user?: DevSessionUser | null };
      const userId = body.user?.id?.trim() ?? null;
      if (!userId) return null;

      const storedUserId = window.localStorage.getItem(JOURNAL_SESSION_USER_STORAGE_KEY)?.trim() ?? null;
      const localSnapshot = readLocalJournalSnapshot();
      const localHasData = localSnapshot.fills.length > 0 || localSnapshot.trades.length > 0;
      const userChanged = Boolean(storedUserId && storedUserId !== userId);
      const legacyUnscopedLocalData = Boolean(!storedUserId && localHasData);

      if (userChanged || legacyUnscopedLocalData) {
        clearLocalJournalSnapshot();
        invalidateJournalPersistenceCache();
      }

      window.localStorage.setItem(JOURNAL_SESSION_USER_STORAGE_KEY, userId);
      return userId;
    } catch {
      return null;
    } finally {
      scopeCheckInFlight = null;
    }
  })();

  return scopeCheckInFlight;
}
