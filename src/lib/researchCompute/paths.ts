import "server-only";

import { createHash } from "node:crypto";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";

export function resolveResearchRoot(): string {
  const override = process.env.EDGE_RESEARCH_ROOT?.trim();
  if (override) return path.resolve(override);
  return path.join(process.cwd(), "data/research");
}

export function ensureResearchRoot(): void {
  mkdirSync(resolveResearchRoot(), { recursive: true });
}

export function datasetRoot(datasetId: string): string {
  return path.join(resolveResearchRoot(), "datasets", datasetId);
}

export function datasetManifestPath(datasetId: string): string {
  return path.join(datasetRoot(datasetId), "manifest.json");
}

export function symbolPartitionPath(datasetId: string, symbol: string): string {
  const safeSymbol = symbol.toUpperCase();
  return path.join(
    datasetRoot(datasetId),
    "partitions",
    `symbol=${safeSymbol}`,
    "bars.parquet",
  );
}

export function jobRoot(jobId: string): string {
  return path.join(resolveResearchRoot(), "jobs", jobId);
}

export function jobRecordPath(jobId: string): string {
  return path.join(jobRoot(jobId), "job.json");
}

export function artifactRoot(artifactId: string): string {
  return path.join(resolveResearchRoot(), "artifacts", artifactId);
}

export function artifactPayloadPath(artifactId: string): string {
  return path.join(artifactRoot(artifactId), "payload.json");
}

export function artifactMetaPath(artifactId: string): string {
  return path.join(artifactRoot(artifactId), "meta.json");
}

export function assertSafeId(id: string, label: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(`Invalid ${label} id`);
  }
}

export function ensureParentDir(filePath: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

export function datasetExists(datasetId: string): boolean {
  return existsSync(datasetManifestPath(datasetId));
}
