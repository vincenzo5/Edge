let serverCacheDegraded = false;

export function markServerCacheDegraded(): void {
  serverCacheDegraded = true;
}

export function isServerCacheDegraded(): boolean {
  return serverCacheDegraded;
}

export function resetServerCacheDegradedForTests(): void {
  serverCacheDegraded = false;
}
