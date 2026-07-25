import type { ChartLayout } from "@/lib/chartConfig";
import { cellChartId, getCellRevision, isCellLayoutStoreHydrated } from "@/lib/chart/cellLayoutStore";
import { cellCountFor } from "@/lib/chartConfig";

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

/**
 * Revision-based layout fingerprint — avoids stringifying drawings/viewport on hot path.
 * Falls back to full layout fingerprint when cell store has no entries yet.
 */
export function layoutRevisionFingerprint(layout: ChartLayout): string {
  const count = cellCountFor(layout.layoutId);
  if (!isCellLayoutStoreHydrated()) {
    return layoutContentFingerprint(layout);
  }

  const shell = [
    layout.layoutId,
    layout.activeCellIndex ?? 0,
    layout.linkSymbol,
    layout.linkInterval,
    layout.linkCrosshair,
    layout.linkDrawings,
    JSON.stringify(layout.toolbarPrefs),
    JSON.stringify(layout.sidebar),
  ].join("\0");
  const cellRevs = Array.from({ length: count }, (_, i) => getCellRevision(cellChartId(i))).join(
    ",",
  );
  return fnv1aHash(`${shell}\0${cellRevs}`);
}

export function layoutsContentEqual(a: ChartLayout, b: ChartLayout): boolean {
  if (a === b) return true;
  return layoutRevisionFingerprint(a) === layoutRevisionFingerprint(b);
}

/** Test helper — reset identity cache between Vitest cases. */
export function resetLayoutContentFingerprintCacheForTests(): void {
  fingerprintCache = new WeakMap<object, string>();
}
