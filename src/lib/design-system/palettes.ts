export const PALETTES = ["midnight", "graphite", "slate"] as const;

export type PaletteId = (typeof PALETTES)[number];

export const DEFAULT_PALETTE: PaletteId = "midnight";

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === "string" && (PALETTES as readonly string[]).includes(value);
}

export function coercePaletteId(
  value: unknown,
  fallback: PaletteId = DEFAULT_PALETTE,
): PaletteId {
  return isPaletteId(value) ? value : fallback;
}

export const PALETTE_LABELS: Record<PaletteId, string> = {
  midnight: "Midnight",
  graphite: "Graphite",
  slate: "Deep Slate",
};

export const PALETTE_DESCRIPTIONS: Record<PaletteId, string> = {
  midnight: "Pure-black chart stage with blue-leaning chrome.",
  graphite: "Neutral grays with a soft steel accent.",
  slate: "Slate-tinted surfaces with a cyan-steel accent.",
};
