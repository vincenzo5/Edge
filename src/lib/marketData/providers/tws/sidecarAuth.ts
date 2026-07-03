export const EDGE_SIDECAR_SECRET_HEADER = "X-Edge-Sidecar-Secret";

export function readSidecarSecret(): string | null {
  const secret = process.env.TWS_SIDECAR_SECRET?.trim();
  return secret || null;
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
