/** Frozen v1 caps from quant-research-runtime roadmap §0.1. */
export const MAX_RESEARCH_SYMBOLS = 50;
export const MAX_RESEARCH_TOTAL_BARS = 500_000;
export const MAX_PREVIEW_TABLE_ROWS = 20;
export const MAX_CONCURRENT_JOBS = 4;
export const MAX_JOB_WALL_TIME_MS = 120_000;

/** Phase 4 sandbox budgets. */
export const MAX_RESEARCH_CODE_SOURCE_BYTES = 32_768;
export const MAX_RESEARCH_WORKER_OUTPUT_BYTES = 256_000;
export const MAX_RESEARCH_WORKER_MEMORY_MB = 512;
export const MAX_RESEARCH_WORKER_PIDS = 64;
export const MAX_RESEARCH_STDOUT_CHARS = 8_192;

export const RESEARCH_WORKER_IMAGE =
  process.env.EDGE_RESEARCH_WORKER_IMAGE?.trim() || "edge-research-worker:latest";

export const MAX_TOOL_INPUT_JSON_BYTES = 65_536;

export const COMPUTE_VERSION = "1.4.0";
export const ACQUISITION_POLICY_VERSION = "1";

export const DEFAULT_RESEARCH_ADJUSTMENT = "split" as const;
export const DEFAULT_RESEARCH_TIMEZONE = "UTC";
