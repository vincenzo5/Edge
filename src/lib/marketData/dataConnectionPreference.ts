import {
  IB_LIVE_CONNECTION_ID,
  IB_PAPER_CONNECTION_ID,
} from "@/lib/trading/connectionRegistry";

export const DATA_CONNECTION_PREFERENCE_KEY = "edge:marketData:connectionId";
export const DATA_CONNECTION_PREFERENCE_EXPLICIT_KEY = "edge:marketData:connectionId:explicit";

export type DataConnectionId = typeof IB_PAPER_CONNECTION_ID | typeof IB_LIVE_CONNECTION_ID;

const VALID_IDS = new Set<DataConnectionId>([IB_PAPER_CONNECTION_ID, IB_LIVE_CONNECTION_ID]);

function isDataConnectionId(value: string | null | undefined): value is DataConnectionId {
  return value != null && VALID_IDS.has(value as DataConnectionId);
}

export function readDataConnectionPreference(): DataConnectionId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DATA_CONNECTION_PREFERENCE_KEY);
    return isDataConnectionId(raw) ? raw : null;
  } catch {
    return null;
  }
}

const DATA_CONNECTION_PREFERENCE_EVENT = "edge:dataConnectionPreference";

function notifyDataConnectionPreferenceChange(connectionId: DataConnectionId): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<DataConnectionId>(DATA_CONNECTION_PREFERENCE_EVENT, {
      detail: connectionId,
    }),
  );
}

export function writeDataConnectionPreference(connectionId: DataConnectionId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DATA_CONNECTION_PREFERENCE_KEY, connectionId);
    notifyDataConnectionPreferenceChange(connectionId);
  } catch {
    // Ignore quota / privacy mode failures.
  }
}

export function writeExplicitDataConnectionPreference(connectionId: DataConnectionId): void {
  writeDataConnectionPreference(connectionId);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DATA_CONNECTION_PREFERENCE_EXPLICIT_KEY, "1");
  } catch {
    // Ignore quota / privacy mode failures.
  }
}

export function hasExplicitDataConnectionPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DATA_CONNECTION_PREFERENCE_EXPLICIT_KEY) === "1";
  } catch {
    return false;
  }
}

export function applyDefaultDataConnectionPreferenceIfNeeded(options: {
  liveConnected: boolean;
}): DataConnectionId {
  const stored = readDataConnectionPreference();
  if (hasExplicitDataConnectionPreference() && stored) {
    return stored;
  }
  const resolved = resolveDefaultDataConnectionPreference(options);
  writeDataConnectionPreference(resolved);
  return resolved;
}

export function resolveDefaultDataConnectionPreference(options: {
  liveConnected: boolean;
}): DataConnectionId {
  return options.liveConnected ? IB_LIVE_CONNECTION_ID : IB_PAPER_CONNECTION_ID;
}

export function readEffectiveDataConnectionPreference(options: {
  liveConnected: boolean;
}): DataConnectionId {
  return readDataConnectionPreference() ?? resolveDefaultDataConnectionPreference(options);
}

export function dataConnectionLabel(connectionId: DataConnectionId): string {
  return connectionId === IB_LIVE_CONNECTION_ID ? "Live data" : "Paper data";
}
