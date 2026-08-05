import {
  IB_LIVE_CONNECTION_ID,
  IB_PAPER_CONNECTION_ID,
} from "@/lib/trading/connectionRegistry";

export const DATA_CONNECTION_PREFERENCE_KEY = "edge:marketData:connectionId";
export const DATA_CONNECTION_PREFERENCE_EXPLICIT_KEY = "edge:marketData:connectionId:explicit";

export type DataConnectionId = typeof IB_PAPER_CONNECTION_ID | typeof IB_LIVE_CONNECTION_ID;

const DATA_CONNECTION_PREFERENCE_EVENT = "edge:dataConnectionPreference";

function notifyDataConnectionPreferenceChange(connectionId: DataConnectionId): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<DataConnectionId>(DATA_CONNECTION_PREFERENCE_EVENT, {
      detail: connectionId,
    }),
  );
}

/** Platform policy: display market data always uses the live IB Gateway socket. */
export function ensureLiveDataConnectionPreference(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DATA_CONNECTION_PREFERENCE_KEY, IB_LIVE_CONNECTION_ID);
    window.localStorage.removeItem(DATA_CONNECTION_PREFERENCE_EXPLICIT_KEY);
  } catch {
    // Ignore quota / privacy mode failures.
  }
}

export function readDataConnectionPreference(): DataConnectionId {
  if (typeof window !== "undefined") {
    ensureLiveDataConnectionPreference();
  }
  return IB_LIVE_CONNECTION_ID;
}

export function writeDataConnectionPreference(_connectionId?: DataConnectionId): void {
  if (typeof window === "undefined") return;
  ensureLiveDataConnectionPreference();
  notifyDataConnectionPreferenceChange(IB_LIVE_CONNECTION_ID);
  void import("@/lib/userPreferences/userPreferencesSync").then(({ notifyUserPreferencesChanged }) =>
    notifyUserPreferencesChanged(),
  );
}

export function writeExplicitDataConnectionPreference(_connectionId?: DataConnectionId): void {
  writeDataConnectionPreference(IB_LIVE_CONNECTION_ID);
}

export function hasExplicitDataConnectionPreference(): boolean {
  return false;
}

export function applyDefaultDataConnectionPreferenceIfNeeded(_options?: {
  liveConnected: boolean;
}): DataConnectionId {
  if (typeof window !== "undefined") {
    ensureLiveDataConnectionPreference();
  }
  return IB_LIVE_CONNECTION_ID;
}

export function resolveDefaultDataConnectionPreference(_options?: {
  liveConnected: boolean;
}): DataConnectionId {
  return IB_LIVE_CONNECTION_ID;
}

export function readEffectiveDataConnectionPreference(_options?: {
  liveConnected: boolean;
}): DataConnectionId {
  return readDataConnectionPreference();
}

export function dataConnectionLabel(connectionId: DataConnectionId): string {
  return connectionId === IB_LIVE_CONNECTION_ID ? "Live data" : "Paper data";
}
