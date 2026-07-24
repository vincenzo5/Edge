import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { PermissionMode } from "@edge/ai-tools-core";

import { readAuthSecret } from "@/lib/persistence/auth/signedCookieCore";

const TOKEN_TTL_MS = 5 * 60 * 1000;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

export function hashToolInput(input: unknown): string {
  return createHash("sha256").update(stableStringify(input ?? {})).digest("base64url");
}

function readConfirmationSecret(): string | null {
  return readAuthSecret() ?? process.env.EDGE_API_KEY?.trim() ?? null;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function mintConfirmationToken(params: {
  toolName: string;
  input: unknown;
  permissionMode: PermissionMode;
  now?: number;
}): string | null {
  const secret = readConfirmationSecret();
  if (!secret) return null;

  const exp = (params.now ?? Date.now()) + TOKEN_TTL_MS;
  const payload = `${params.toolName}|${hashToolInput(params.input)}|${params.permissionMode}|${exp}`;
  const signature = signPayload(payload, secret);
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${signature}`;
}

export function verifyConfirmationToken(
  token: string,
  toolName: string,
  input: unknown,
  permissionMode: PermissionMode,
  now = Date.now(),
): boolean {
  const secret = readConfirmationSecret();
  if (!secret) return false;

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex <= 0) return false;

  const encodedPayload = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  if (!encodedPayload || !signature) return false;

  let payload: string;
  try {
    payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  } catch {
    return false;
  }

  const expectedSignature = signPayload(payload, secret);
  try {
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (actualBuffer.length !== expectedBuffer.length) return false;
    if (!timingSafeEqual(actualBuffer, expectedBuffer)) return false;
  } catch {
    return false;
  }

  const parts = payload.split("|");
  if (parts.length !== 4) return false;

  const [tokenToolName, tokenInputHash, tokenPermissionMode, expRaw] = parts;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < now) return false;
  if (tokenToolName !== toolName) return false;
  if (tokenPermissionMode !== permissionMode) return false;
  if (tokenInputHash !== hashToolInput(input)) return false;

  return true;
}

export function createConfirmationVerifier() {
  return (
    token: string,
    toolName: string,
    input: unknown,
    permissionMode: PermissionMode,
  ) => verifyConfirmationToken(token, toolName, input, permissionMode);
}
