import "server-only";

import { readFileSync, writeFileSync } from "node:fs";

import type { DatasetManifest } from "./contracts";
import { datasetManifestSchema } from "./contracts";
import { assertSafeId, ensureParentDir, datasetManifestPath } from "./paths";

export function readDatasetManifest(datasetId: string): DatasetManifest | null {
  assertSafeId(datasetId, "dataset");
  const filePath = datasetManifestPath(datasetId);
  try {
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
    return datasetManifestSchema.parse(raw);
  } catch {
    return null;
  }
}

export function writeDatasetManifest(datasetId: string, manifest: DatasetManifest): void {
  assertSafeId(datasetId, "dataset");
  const parsed = datasetManifestSchema.parse(manifest);
  const filePath = datasetManifestPath(datasetId);
  ensureParentDir(filePath);
  writeFileSync(filePath, JSON.stringify(parsed, null, 2), "utf8");
}

export function requireDatasetManifest(datasetId: string): DatasetManifest {
  const manifest = readDatasetManifest(datasetId);
  if (!manifest) {
    throw new Error(`Dataset not found: ${datasetId}`);
  }
  return manifest;
}
