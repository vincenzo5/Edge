import {
  BRIDGE_SECRET_HEADER,
  BRIDGE_SECRET_STORAGE_KEY,
  BRIDGE_SESSION_ID_STORAGE_KEY,
} from "./bridgeConstants";

export { BRIDGE_SECRET_HEADER };

export function readStoredBridgeCredentials(): {
  sessionId: string | null;
  bridgeSecret: string | null;
} {
  if (typeof sessionStorage === "undefined") {
    return { sessionId: null, bridgeSecret: null };
  }
  return {
    sessionId: sessionStorage.getItem(BRIDGE_SESSION_ID_STORAGE_KEY)?.trim() || null,
    bridgeSecret: sessionStorage.getItem(BRIDGE_SECRET_STORAGE_KEY)?.trim() || null,
  };
}

export function persistBridgeCredentials(sessionId: string, bridgeSecret: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(BRIDGE_SESSION_ID_STORAGE_KEY, sessionId);
  sessionStorage.setItem(BRIDGE_SECRET_STORAGE_KEY, bridgeSecret);
}

export function bridgeSecretHeaders(bridgeSecret: string | null): HeadersInit {
  if (!bridgeSecret) {
    return { "Content-Type": "application/json" };
  }
  return {
    "Content-Type": "application/json",
    [BRIDGE_SECRET_HEADER]: bridgeSecret,
  };
}

export function bridgeSecretGetHeaders(bridgeSecret: string | null): HeadersInit {
  if (!bridgeSecret) return {};
  return { [BRIDGE_SECRET_HEADER]: bridgeSecret };
}
