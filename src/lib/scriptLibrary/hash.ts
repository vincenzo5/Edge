import {
  SCRIPT_LANGUAGE_VERSION,
  SCRIPT_SDK_VERSION,
} from "@edge/chart-core";

/** Deterministic source normalization — must match @edge/indicator-runtime. */
export function normalizeScriptSource(source: string): string {
  let normalized = source.replace(/^\uFEFF/, "");
  normalized = normalized.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  normalized = normalized
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n");
  if (normalized.length > 0 && !normalized.endsWith("\n")) {
    normalized += "\n";
  }
  return normalized;
}

function hashPayload(normalizedSource: string): string {
  return `${SCRIPT_LANGUAGE_VERSION}\0${SCRIPT_SDK_VERSION}\0${normalizedSource}`;
}

/** Sync hash for Node/Vitest — uses node:crypto when available. */
export function hashNormalizedScriptSource(normalizedSource: string): string {
  const payload = hashPayload(normalizedSource);
  if (typeof process !== "undefined" && process.versions?.node) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createHash } = require("node:crypto") as typeof import("node:crypto");
    return createHash("sha256").update(payload).digest("hex").slice(0, 16);
  }
  throw new Error("hashNormalizedScriptSource requires async in browser");
}

export async function hashNormalizedScriptSourceAsync(
  normalizedSource: string,
): Promise<string> {
  const payload = hashPayload(normalizedSource);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const data = new TextEncoder().encode(payload);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
  }
  return hashNormalizedScriptSource(normalizedSource);
}

export function computeRevisionFromSource(source: string): string {
  return hashNormalizedScriptSource(normalizeScriptSource(source));
}

export async function computeRevisionFromSourceAsync(source: string): Promise<string> {
  return hashNormalizedScriptSourceAsync(normalizeScriptSource(source));
}
