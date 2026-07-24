import { isLoopbackIp } from "@/lib/api/clientIp";
import { CONFIG_DEFAULTS, getConfigSource, TWS_KEYS } from "../../config";

export const EDGE_SIDECAR_SECRET_HEADER = "X-Edge-Sidecar-Secret";

export class SidecarAuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SidecarAuthConfigurationError";
  }
}

export function readSidecarSecret(): string | null {
  const secret = getConfigSource().get(TWS_KEYS.sidecarSecret)?.trim();
  return secret ? secret : null;
}

export function resolveSidecarUrl(raw?: string | null): string {
  const baseUrl = raw?.trim() || getConfigSource().get(TWS_KEYS.sidecarUrl) || CONFIG_DEFAULTS.twsSidecarUrl;
  return baseUrl.replace(/\/$/, "");
}

export function isSidecarUrlLoopback(url: string): boolean {
  try {
    let hostname = new URL(url).hostname.trim().toLowerCase();
    if (hostname.startsWith("[") && hostname.endsWith("]")) {
      hostname = hostname.slice(1, -1);
    }
    return isLoopbackIp(hostname);
  } catch {
    return false;
  }
}

export function assertSidecarAuthConfigured(url: string): void {
  if (isSidecarUrlLoopback(url)) return;
  if (readSidecarSecret()) return;
  throw new SidecarAuthConfigurationError(
    "TWS_SIDECAR_SECRET is required when TWS_SIDECAR_URL is not loopback (127.0.0.1, localhost, ::1).",
  );
}

export function sidecarAuthHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  const secret = readSidecarSecret();
  if (!secret) {
    return extra;
  }
  return {
    ...extra,
    [EDGE_SIDECAR_SECRET_HEADER]: secret,
  };
}
