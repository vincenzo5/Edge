import "server-only";

import { getConfigSource, TWS_KEYS } from "../../config";

export type TwsManagedMode = "local" | "external";

/** Who may spawn/kill the sidecar process. Default local when TWS is enabled. */
export function getTwsManagedMode(): TwsManagedMode | null {
  const config = getConfigSource();
  const enabled = config.get(TWS_KEYS.enabled) === "true";
  if (!enabled) return null;

  const raw = config.get(TWS_KEYS.managed)?.toLowerCase();
  if (raw === "external") return "external";
  return "local";
}

export function isTwsLocalManaged(): boolean {
  return getTwsManagedMode() === "local";
}

export function isTwsExternalManaged(): boolean {
  return getTwsManagedMode() === "external";
}

/** Next may spawn/kill the sidecar only in local managed mode. */
export function canNextSpawnSidecar(): boolean {
  return isTwsLocalManaged();
}

/**
 * User-initiated recover (`POST /api/market-data/tws/recover`) may spawn when local
 * managed, or in external mode when port 8765 is not owned by a foreign edge-local sidecar.
 */
export function canSpawnSidecarForUserRecovery(foreignSidecarOnPort = false): boolean {
  if (isTwsLocalManaged()) return true;
  if (isTwsExternalManaged()) return !foreignSidecarOnPort;
  return false;
}
