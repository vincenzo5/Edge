/**
 * Research UX density model — Phase 0 contract (not wired to chrome yet).
 * Desk (`/workspace`) must remain a supported density forever.
 */

export const RESEARCH_DENSITIES = ["Talk", "Board", "Desk", "Stage"] as const;

export type ResearchDensity = (typeof RESEARCH_DENSITIES)[number];

/** Permanent product surfaces — Desk is never removed or disabled-by-default. */
export const PERMANENT_DENSITIES: readonly ResearchDensity[] = ["Talk", "Board", "Desk"];

/** Lightweight confirm / spotlight overlay — not a home density. */
export const OVERLAY_DENSITIES: readonly ResearchDensity[] = ["Stage"];

/** Route anchor for the tiled Desk density. */
export const DESK_DENSITY_ROUTE = "/workspace" as const;

/** Invariant: Desk remains a first-class supported density. */
export const DESK_DENSITY_PERMANENCE = true as const;

export function isPermanentDensity(density: ResearchDensity): boolean {
  return (PERMANENT_DENSITIES as readonly string[]).includes(density);
}

export function isSupportedDensity(density: string): density is ResearchDensity {
  return (RESEARCH_DENSITIES as readonly string[]).includes(density);
}
