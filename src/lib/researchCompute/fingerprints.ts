import { createHash } from "node:crypto";

import type { DatasetIdentity, ResearchBar } from "./contracts";
import {
  ACQUISITION_POLICY_VERSION,
  COMPUTE_VERSION,
  DEFAULT_RESEARCH_ADJUSTMENT,
  DEFAULT_RESEARCH_TIMEZONE,
} from "./constants";

function stableStringify(value: unknown): string {
  if (value == null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function normalizeDatasetIdentity(
  input: Omit<DatasetIdentity, "adjustment" | "timezone"> &
    Partial<Pick<DatasetIdentity, "adjustment" | "timezone">>,
): DatasetIdentity {
  return {
    symbols: [...new Set(input.symbols.map((symbol) => symbol.trim().toUpperCase()))].sort(),
    interval: input.interval,
    fromMs: input.fromMs,
    toMs: input.toMs,
    provider: input.provider.trim(),
    adjustment: input.adjustment ?? DEFAULT_RESEARCH_ADJUSTMENT,
    timezone: input.timezone ?? DEFAULT_RESEARCH_TIMEZONE,
  };
}

export function computeIdentityFingerprint(identity: DatasetIdentity): string {
  return sha256Hex(
    stableStringify({
      symbols: identity.symbols,
      interval: identity.interval,
      fromMs: identity.fromMs,
      toMs: identity.toMs,
      provider: identity.provider,
      adjustment: identity.adjustment,
      timezone: identity.timezone,
      acquisitionPolicyVersion: ACQUISITION_POLICY_VERSION,
    }),
  );
}

export function computeDatasetId(identityFingerprint: string): string {
  return `ds_${identityFingerprint.slice(0, 24)}`;
}

export function computeContentFingerprint(barsBySymbol: Record<string, ResearchBar[]>): string {
  const payload = Object.keys(barsBySymbol)
    .sort()
    .map((symbol) => {
      const bars = barsBySymbol[symbol] ?? [];
      const head = bars[0];
      const tail = bars[bars.length - 1];
      return {
        symbol,
        count: bars.length,
        firstT: head?.t ?? null,
        lastT: tail?.t ?? null,
        closeSum: bars.reduce((sum, bar) => sum + bar.c, 0),
        volumeSum: bars.reduce((sum, bar) => sum + (bar.v ?? 0), 0),
      };
    });
  return sha256Hex(stableStringify(payload));
}

export function computeRunFingerprint(args: {
  datasetId: string;
  identityFingerprint: string;
  toolName: string;
  toolInput: unknown;
}): string {
  return sha256Hex(
    stableStringify({
      datasetId: args.datasetId,
      identityFingerprint: args.identityFingerprint,
      toolName: args.toolName,
      toolInput: args.toolInput,
      computeVersion: COMPUTE_VERSION,
    }),
  );
}

export function createArtifactId(prefix: string): string {
  return `${prefix}_${sha256Hex(`${prefix}:${Date.now()}:${Math.random()}`).slice(0, 16)}`;
}

export function createJobId(): string {
  return createArtifactId("job");
}
