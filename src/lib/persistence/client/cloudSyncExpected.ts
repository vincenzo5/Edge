let cloudSyncExpectedOverride: boolean | null = null;

/** Test hook — override cloud-sync expectation without DATABASE_URL. */
export function setCloudSyncExpectedForTests(value: boolean | null): void {
  cloudSyncExpectedOverride = value;
}

/** Client-safe: Postgres cloud sync is configured (not user auth state). */
export function isCloudSyncExpected(): boolean {
  if (cloudSyncExpectedOverride !== null) return cloudSyncExpectedOverride;
  if (typeof process !== "undefined") {
    return Boolean(process.env.DATABASE_URL?.trim());
  }
  return false;
}
