import "server-only";

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { CompactResearchResult, ResearchJobRecord } from "./contracts";
import { researchJobRecordSchema } from "./contracts";
import { assertSafeId, ensureParentDir, jobRecordPath, resolveResearchRoot } from "./paths";

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

export function listJobRecords(): ResearchJobRecord[] {
  const jobsDir = path.join(resolveResearchRoot(), "jobs");
  try {
    const entries = readdirSync(jobsDir, { withFileTypes: true });
    const records: ResearchJobRecord[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const record = readJobRecord(entry.name);
      if (record) records.push(record);
    }
    return records;
  } catch {
    return [];
  }
}

/** Resolve refs by jobId first, then latest succeeded runFingerprint match. */
export function resolveJobsByRefs(refs: string[]): ResearchJobRecord[] {
  const all = listJobRecords();
  const succeeded = all.filter((record) => record.status === "succeeded" && record.compactResult);
  const resolved: ResearchJobRecord[] = [];
  const seenJobIds = new Set<string>();

  for (const ref of refs) {
    const trimmed = ref.trim();
    if (!trimmed) continue;

    let match =
      succeeded.find((record) => record.jobId === trimmed) ??
      all.find((record) => record.jobId === trimmed && record.compactResult);

    if (!match) {
      const fingerprintMatches = succeeded.filter((record) => record.runFingerprint === trimmed);
      match = fingerprintMatches.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    }

    if (match && !seenJobIds.has(match.jobId)) {
      seenJobIds.add(match.jobId);
      resolved.push(match);
    }
  }

  return resolved;
}
