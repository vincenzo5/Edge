import "server-only";

import { readFileSync, writeFileSync } from "node:fs";

import type { CompactResearchResult, ResearchJobRecord } from "./contracts";
import { researchJobRecordSchema } from "./contracts";
import { assertSafeId, ensureParentDir, jobRecordPath } from "./paths";

export function readJobRecord(jobId: string): ResearchJobRecord | null {
  assertSafeId(jobId, "job");
  try {
    const raw = JSON.parse(readFileSync(jobRecordPath(jobId), "utf8")) as unknown;
    return researchJobRecordSchema.parse(raw);
  } catch {
    return null;
  }
}

export function writeJobRecord(record: ResearchJobRecord): void {
  assertSafeId(record.jobId, "job");
  const parsed = researchJobRecordSchema.parse(record);
  const filePath = jobRecordPath(parsed.jobId);
  ensureParentDir(filePath);
  writeFileSync(filePath, JSON.stringify(parsed, null, 2), "utf8");
}

export function requireJobRecord(jobId: string): ResearchJobRecord {
  const record = readJobRecord(jobId);
  if (!record) {
    throw new Error(`Job not found: ${jobId}`);
  }
  return record;
}

export function updateJobRecord(
  jobId: string,
  patch: Partial<ResearchJobRecord>,
): ResearchJobRecord {
  const current = requireJobRecord(jobId);
  const next = researchJobRecordSchema.parse({ ...current, ...patch, jobId });
  writeJobRecord(next);
  return next;
}

export function terminalCompactResult(record: ResearchJobRecord): CompactResearchResult | null {
  return record.compactResult ?? null;
}
