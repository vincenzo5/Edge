import "server-only";

import { readFileSync, writeFileSync } from "node:fs";

import type { ArtifactKind, ArtifactRef } from "./contracts";
import { artifactKindSchema } from "./contracts";
import { createArtifactId } from "./fingerprints";
import { assertSafeId, artifactMetaPath, artifactPayloadPath, ensureParentDir } from "./paths";

export type ArtifactMeta = {
  artifactId: string;
  kind: ArtifactKind;
  jobId: string;
  label?: string;
  createdAt: string;
};

export function writeArtifact(args: {
  jobId: string;
  kind: ArtifactKind;
  label?: string;
  payload: unknown;
}): ArtifactRef {
  const artifactId = createArtifactId("art");
  const meta: ArtifactMeta = {
    artifactId,
    kind: artifactKindSchema.parse(args.kind),
    jobId: args.jobId,
    label: args.label,
    createdAt: new Date().toISOString(),
  };
  const payloadPath = artifactPayloadPath(artifactId);
  const metaPath = artifactMetaPath(artifactId);
  ensureParentDir(payloadPath);
  writeFileSync(payloadPath, JSON.stringify(args.payload, null, 2), "utf8");
  writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");
  return {
    artifactId,
    kind: meta.kind,
    label: meta.label,
  };
}

export function readArtifactMeta(artifactId: string): ArtifactMeta | null {
  assertSafeId(artifactId, "artifact");
  try {
    const raw = JSON.parse(readFileSync(artifactMetaPath(artifactId), "utf8")) as unknown;
    const record = raw as ArtifactMeta;
    if (!record.artifactId || !record.kind || !record.jobId) return null;
    return record;
  } catch {
    return null;
  }
}

export function readArtifactPayload<T = unknown>(artifactId: string): T | null {
  assertSafeId(artifactId, "artifact");
  try {
    return JSON.parse(readFileSync(artifactPayloadPath(artifactId), "utf8")) as T;
  } catch {
    return null;
  }
}

export function requireArtifactMeta(artifactId: string): ArtifactMeta {
  const meta = readArtifactMeta(artifactId);
  if (!meta) {
    throw new Error(`Artifact not found: ${artifactId}`);
  }
  return meta;
}
