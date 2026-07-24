export type ClientIpSource = Request & { ip?: string | null };

export function readTrustedProxyCount(): number {
  const raw = process.env.EDGE_TRUSTED_PROXY_COUNT?.trim();
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function isLoopbackIp(ip: string): boolean {
  const normalized = ip.trim().toLowerCase();
  return (
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "localhost" ||
    normalized === "::ffff:127.0.0.1"
  );
}

export function readClientIp(request: ClientIpSource): string {
  const proxyCount = readTrustedProxyCount();
  if (proxyCount > 0) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const hops = forwarded
        .split(",")
        .map((hop) => hop.trim())
        .filter(Boolean);
      if (hops.length > proxyCount) {
        return hops[hops.length - proxyCount - 1] ?? "unknown";
      }
    }

    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;
  }

  const peerIp = request.ip?.trim();
  if (peerIp) return peerIp;

  return "unknown";
}
