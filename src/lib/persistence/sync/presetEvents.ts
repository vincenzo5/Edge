export const PRESETS_UPDATED_EVENT = "tv-ai:presets-updated";

export function notifyPresetsUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PRESETS_UPDATED_EVENT));
}
