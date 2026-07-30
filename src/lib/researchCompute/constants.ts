/** Frozen v1 caps from quant-research-runtime roadmap §0.1. */
export const MAX_RESEARCH_SYMBOLS = 50;
export const MAX_RESEARCH_TOTAL_BARS = 500_000;
export const MAX_PREVIEW_TABLE_ROWS = 20;
export const MAX_CONCURRENT_JOBS = 4;
export const MAX_JOB_WALL_TIME_MS = 120_000;

export const COMPUTE_VERSION = "1.2.0";
export const ACQUISITION_POLICY_VERSION = "1";

export const DEFAULT_RESEARCH_ADJUSTMENT = "split" as const;
export const DEFAULT_RESEARCH_TIMEZONE = "UTC";
