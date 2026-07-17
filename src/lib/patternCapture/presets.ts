export const SECTION_LABEL_PRESETS = [
  "start",
  "setup",
  "pullback",
  "trigger",
  "impulse",
  "outcome",
  "invalidation",
] as const;

export type SectionLabelPreset = (typeof SECTION_LABEL_PRESETS)[number];

export function presetAtIndex(index: number): SectionLabelPreset | null {
  const i = index - 1;
  if (i < 0 || i >= SECTION_LABEL_PRESETS.length) return null;
  return SECTION_LABEL_PRESETS[i]!;
}
