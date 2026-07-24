import { z } from "zod";

export const DAY_PROFILE_UNIVERSE = ["tape_index", "sector", "single_name"] as const;
export const DAY_TYPE = [
  "trend",
  "double_distribution",
  "normal",
  "normal_variation",
  "neutral",
  "non_trend",
  "unknown",
] as const;
export const OPEN_TYPE = [
  "open_drive",
  "open_test_drive",
  "open_rejection_reverse",
  "open_auction",
  "open_unknown",
] as const;
export const GAP_TYPE = [
  "gap_none",
  "gap_and_go",
  "gap_fill",
  "gap_and_fade",
  "gap_partial",
  "island",
] as const;
export const VOLATILITY_TYPE = ["vol_expand", "vol_normal", "vol_contract", "vol_climax"] as const;
export const PARTICIPATION_TYPE = ["rvol_high", "rvol_normal", "rvol_low"] as const;
export const CATALYST_TYPE = [
  "catalyst_scheduled",
  "catalyst_unscheduled",
  "catalyst_none",
] as const;
export const RELATIVE_TYPE = ["leader", "laggard", "beta_proxy", "idiosyncratic"] as const;
export const DAY_PROFILE_STATUS = ["proposed", "confirmed", "rejected"] as const;

export type DayProfileUniverse = (typeof DAY_PROFILE_UNIVERSE)[number];
export type DayType = (typeof DAY_TYPE)[number];
export type OpenType = (typeof OPEN_TYPE)[number];
export type GapType = (typeof GAP_TYPE)[number];
export type VolatilityType = (typeof VOLATILITY_TYPE)[number];
export type ParticipationType = (typeof PARTICIPATION_TYPE)[number];
export type CatalystType = (typeof CATALYST_TYPE)[number];
export type RelativeType = (typeof RELATIVE_TYPE)[number];
export type DayProfileStatus = (typeof DAY_PROFILE_STATUS)[number];

export const dayProfileSchema = z.object({
  symbol: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  universe: z.enum(DAY_PROFILE_UNIVERSE),
  dayType: z.enum(DAY_TYPE),
  openType: z.enum(OPEN_TYPE),
  gap: z.enum(GAP_TYPE),
  volatility: z.enum(VOLATILITY_TYPE),
  participation: z.enum(PARTICIPATION_TYPE),
  catalyst: z.union([z.enum(CATALYST_TYPE), z.literal("")]),
  relative: z.union([z.enum(RELATIVE_TYPE), z.literal("")]),
  gapPct: z.number().nullable(),
  rangeAtr: z.number().nullable(),
  rvol: z.number().nullable(),
  closeLoc: z.number().nullable(),
  retPct: z.number().nullable(),
  spyRetPct: z.number().nullable(),
  status: z.enum(DAY_PROFILE_STATUS),
  notes: z.string(),
});

export type DayProfile = z.infer<typeof dayProfileSchema>;

export type DayProfileFilters = {
  symbol?: string;
  universe?: DayProfileUniverse;
  dayType?: DayType;
  openType?: OpenType;
  gap?: GapType;
  volatility?: VolatilityType;
  participation?: ParticipationType;
  relative?: RelativeType;
  status?: DayProfileStatus;
};

export const dayProfileQuerySchema = z.object({
  symbol: z.string().optional(),
  universe: z.enum(DAY_PROFILE_UNIVERSE).optional(),
  dayType: z.enum(DAY_TYPE).optional(),
  openType: z.enum(OPEN_TYPE).optional(),
  gap: z.enum(GAP_TYPE).optional(),
  volatility: z.enum(VOLATILITY_TYPE).optional(),
  participation: z.enum(PARTICIPATION_TYPE).optional(),
  relative: z.enum(RELATIVE_TYPE).optional(),
  status: z.enum(DAY_PROFILE_STATUS).optional(),
});

export type DayProfileQuery = z.infer<typeof dayProfileQuerySchema>;

export const CONFIRMED_DAY_PROFILES_PATH =
  "data/day-profiles/proposed/batch-20260718.csv";
