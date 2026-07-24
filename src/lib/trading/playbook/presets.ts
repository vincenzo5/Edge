import type { BracketStopLeg } from "../types";
import type { PlaybookTemplate } from "./types";

const DEFAULT_TRAIL: BracketStopLeg = { mode: "trail", trailAmount: 1 };

export const PLAYBOOK_PRESET_IDS = [
  "break_even",
  "half_then_be",
  "half_plus_trail",
  "scale_3x",
  "daytrade_flatten",
] as const;

export type PlaybookPresetId = (typeof PLAYBOOK_PRESET_IDS)[number];

export const BREAK_EVEN_PRESET: PlaybookTemplate = {
  id: "break_even",
  name: "Break-even",
  description: "Move stop to entry at +1R.",
  rules: [
    {
      id: "be-at-1r",
      label: "Break-even at +1R",
      when: { kind: "multipleOfR", multiple: 1 },
      then: { kind: "modifyStop", breakEven: true },
      once: true,
    },
  ],
};

export const HALF_THEN_BE_PRESET: PlaybookTemplate = {
  id: "half_then_be",
  name: "Half then BE",
  description: "Reduce 50% at +1R, then move stop to entry.",
  rules: [
    {
      id: "scale-half-1r",
      label: "Scale out 50% at +1R",
      when: { kind: "multipleOfR", multiple: 1 },
      then: { kind: "reduceQty", fraction: 0.5 },
      once: true,
      priority: 1,
    },
    {
      id: "be-after-half",
      label: "Break-even after scale",
      when: { kind: "scaleFill", ruleId: "scale-half-1r" },
      then: { kind: "modifyStop", breakEven: true },
      once: true,
      requires: ["scale-half-1r"],
      priority: 2,
    },
  ],
};

export const HALF_PLUS_TRAIL_PRESET: PlaybookTemplate = {
  id: "half_plus_trail",
  name: "Half + trail",
  description: "Reduce 50% at +1R, then trail the remainder.",
  rules: [
    {
      id: "scale-half-1r",
      label: "Scale out 50% at +1R",
      when: { kind: "multipleOfR", multiple: 1 },
      then: { kind: "reduceQty", fraction: 0.5 },
      once: true,
      priority: 1,
    },
    {
      id: "trail-remainder",
      label: "Trail remainder after scale",
      when: { kind: "scaleFill", ruleId: "scale-half-1r" },
      then: { kind: "attachTrail", stopLeg: DEFAULT_TRAIL },
      once: true,
      requires: ["scale-half-1r"],
      priority: 2,
    },
  ],
};

export const SCALE_3X_PRESET: PlaybookTemplate = {
  id: "scale_3x",
  name: "Scale 3×",
  description: "⅓ at 1R, ⅓ at 2R, trail runner; break-even after first scale.",
  rules: [
    {
      id: "scale-third-1r",
      label: "Scale ⅓ at +1R",
      when: { kind: "multipleOfR", multiple: 1 },
      then: { kind: "reduceQty", fraction: 1 / 3 },
      once: true,
      priority: 1,
    },
    {
      id: "be-after-first-scale",
      label: "Break-even after first scale",
      when: { kind: "scaleFill", ruleId: "scale-third-1r" },
      then: { kind: "modifyStop", breakEven: true },
      once: true,
      requires: ["scale-third-1r"],
      priority: 2,
    },
    {
      id: "scale-third-2r",
      label: "Scale ⅓ at +2R",
      when: { kind: "multipleOfR", multiple: 2 },
      then: { kind: "reduceQty", fraction: 1 / 3 },
      once: true,
      priority: 3,
    },
    {
      id: "trail-runner",
      label: "Trail runner after second scale",
      when: { kind: "scaleFill", ruleId: "scale-third-2r" },
      then: { kind: "attachTrail", stopLeg: DEFAULT_TRAIL },
      once: true,
      requires: ["scale-third-2r"],
      priority: 4,
    },
  ],
};

export const DAYTRADE_FLATTEN_PRESET: PlaybookTemplate = {
  id: "daytrade_flatten",
  name: "Daytrade flatten",
  description: "Break-even at +1R; flatten before session close.",
  rules: [
    {
      id: "be-at-1r",
      label: "Break-even at +1R",
      when: { kind: "multipleOfR", multiple: 1 },
      then: { kind: "modifyStop", breakEven: true },
      once: true,
      priority: 1,
    },
    {
      id: "session-flatten",
      label: "Flatten before close",
      when: { kind: "sessionFlatten", minutesBeforeClose: 5 },
      then: { kind: "flatten" },
      once: true,
      priority: 2,
    },
  ],
};

export const PLAYBOOK_PRESETS: Record<PlaybookPresetId, PlaybookTemplate> = {
  break_even: BREAK_EVEN_PRESET,
  half_then_be: HALF_THEN_BE_PRESET,
  half_plus_trail: HALF_PLUS_TRAIL_PRESET,
  scale_3x: SCALE_3X_PRESET,
  daytrade_flatten: DAYTRADE_FLATTEN_PRESET,
};

export const PLAYBOOK_PRESET_LIST: PlaybookTemplate[] = PLAYBOOK_PRESET_IDS.map(
  (id) => PLAYBOOK_PRESETS[id],
);

export function getPlaybookPreset(id: string): PlaybookTemplate | null {
  if (!(PLAYBOOK_PRESET_IDS as readonly string[]).includes(id)) {
    return null;
  }
  return PLAYBOOK_PRESETS[id as PlaybookPresetId];
}
