/**
 * Opt-in default research density — Phase 8 (local-only; not in cloud userPreferences snapshot).
 */

import type { PermanentResearchDensity } from "./densityNav";

export const RESEARCH_DEFAULT_DENSITY_KEY = "tv-ai:research-default-density:v1";

export type DefaultResearchDensity = PermanentResearchDensity;

export const DEFAULT_RESEARCH_DENSITY: DefaultResearchDensity = "Desk";

const DEFAULT_DENSITY_EVENT = "edge:researchDefaultDensity";

function isDefaultResearchDensity(value: unknown): value is DefaultResearchDensity {
  return value === "Talk" || value === "Board" || value === "Desk";
}

export function readDefaultDensityPreference(): DefaultResearchDensity {
  if (typeof window === "undefined") return DEFAULT_RESEARCH_DENSITY;
  try {
    const raw = window.localStorage.getItem(RESEARCH_DEFAULT_DENSITY_KEY);
    return isDefaultResearchDensity(raw) ? raw : DEFAULT_RESEARCH_DENSITY;
  } catch {
    return DEFAULT_RESEARCH_DENSITY;
  }
}

export function writeDefaultDensityPreference(density: DefaultResearchDensity): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RESEARCH_DEFAULT_DENSITY_KEY, density);
    window.dispatchEvent(
      new CustomEvent<DefaultResearchDensity>(DEFAULT_DENSITY_EVENT, { detail: density }),
    );
  } catch {
    // Ignore quota / privacy mode failures.
  }
}

export function subscribeDefaultDensityPreference(
  listener: (density: DefaultResearchDensity) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<DefaultResearchDensity>).detail;
    if (detail) listener(detail);
  };
  window.addEventListener(DEFAULT_DENSITY_EVENT, handler);
  return () => window.removeEventListener(DEFAULT_DENSITY_EVENT, handler);
}
