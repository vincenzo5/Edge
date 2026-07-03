import { createHmac, timingSafeEqual } from "node:crypto";

export const EDGE_USER_COOKIE = "edge-user-id";

export class AuthSecretMissingError extends Error {
  constructor() {
    super("EDGE_AUTH_SECRET is required when persistence is enabled");
    this.name = "AuthSecretMissingError";
  }
}

export function readAuthSecret(): string | null {
  const secret = process.env.EDGE_AUTH_SECRET?.trim();
  return secret || null;
}

export function getAuthSecret(): string {
  const secret = readAuthSecret();
  if (!secret) {
    throw new AuthSecretMissingError();
  }
  return secret;
}

function signUserId(userId: string, secret: string): string {
  return createHmac("sha256", secret).update(userId).digest("base64url");
}

export function createSignedUserCookieValue(userId: string, secret?: string): string {
  const resolved = secret ?? getAuthSecret();
  return `${userId}.${signUserId(userId, resolved)}`;
}

export function verifySignedUserCookieValue(
  cookieValue: string,
  secret?: string,
): string | null {
  const resolved = secret ?? readAuthSecret();
  if (!resolved) {
    return null;
  }

  const dotIndex = cookieValue.lastIndexOf(".");
  if (dotIndex <= 0) {
    return null;
  }

  const userId = cookieValue.slice(0, dotIndex);
  const signature = cookieValue.slice(dotIndex + 1);
  if (!userId || !signature) {
    return null;
  }

  const expectedSignature = signUserId(userId, resolved);

  try {
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (actualBuffer.length !== expectedBuffer.length) {
      return null;
    }
    if (!timingSafeEqual(actualBuffer, expectedBuffer)) {
      return null;
    }
  } catch {
    return null;
  }

  return userId;
}

export function getSignedUserCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  };
}
