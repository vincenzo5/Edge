import type { ChartLayout } from "@/lib/chartConfig";

let fingerprintCache = new WeakMap<object, string>();

/** FNV-1a 32-bit hash rendered in base36 for compact content keys. */
export function fnv1aHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/** Stable fingerprint for chart layout equality and dirty keys (identity-cached). */
export function layoutContentFingerprint(layout: ChartLayout): string {
  const cached = fingerprintCache.get(layout);
  if (cached !== undefined) return cached;

  const fingerprint = fnv1aHash(JSON.stringify(layout));
  fingerprintCache.set(layout, fingerprint);
  return fingerprint;
}

export function layoutsContentEqual(a: ChartLayout, b: ChartLayout): boolean {
  if (a === b) return true;
  return layoutContentFingerprint(a) === layoutContentFingerprint(b);
}

/** Test helper — reset identity cache between Vitest cases. */
export function resetLayoutContentFingerprintCacheForTests(): void {
  fingerprintCache = new WeakMap<object, string>();
}
