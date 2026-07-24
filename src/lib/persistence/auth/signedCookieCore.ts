import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const EDGE_USER_COOKIE = "edge-user-id";

/** Server-enforced session lifetime; browser Max-Age matches this value. */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 14;

/** Allow small clock skew when validating freshly minted cookies. */
export const SESSION_MAX_CLOCK_SKEW_SEC = 60;

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

export type CreateSignedUserCookieOptions = {
  secret?: string;
  now?: number;
  jti?: string;
};

function resolveCreateOptions(
  secretOrOptions?: string | CreateSignedUserCookieOptions,
): Required<Pick<CreateSignedUserCookieOptions, "secret">> &
  Pick<CreateSignedUserCookieOptions, "now" | "jti"> {
  if (typeof secretOrOptions === "string") {
    return { secret: secretOrOptions };
  }
  return {
    secret: secretOrOptions?.secret ?? getAuthSecret(),
    now: secretOrOptions?.now,
    jti: secretOrOptions?.jti,
  };
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function encodeSessionPayload(userId: string, iat: number, jti: string): string {
  return Buffer.from(`${userId}|${iat}|${jti}`, "utf8").toString("base64url");
}

function decodeSessionPayload(encoded: string): { userId: string; iat: number; jti: string } | null {
  try {
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 3) {
      return null;
    }
    const [userId, iatRaw, jti] = parts;
    if (!userId || !jti) {
      return null;
    }
    const iat = Number.parseInt(iatRaw, 10);
    if (!Number.isFinite(iat) || iat <= 0) {
      return null;
    }
    return { userId, iat, jti };
  } catch {
    return null;
  }
}

export function createSignedUserCookieValue(
  userId: string,
  secretOrOptions?: string | CreateSignedUserCookieOptions,
): string {
  const options = resolveCreateOptions(secretOrOptions);
  const iat = Math.floor((options.now ?? Date.now()) / 1000);
  const jti = options.jti ?? randomUUID();
  const encoded = encodeSessionPayload(userId, iat, jti);
  const signature = signPayload(encoded, options.secret);
  return `${encoded}.${signature}`;
}

export function verifySignedUserCookieValue(
  cookieValue: string,
  secret?: string,
  nowSec = Math.floor(Date.now() / 1000),
): string | null {
  const resolved = secret ?? readAuthSecret();
  if (!resolved) {
    return null;
  }

  const dotIndex = cookieValue.lastIndexOf(".");
  if (dotIndex <= 0) {
    return null;
  }

  const encoded = cookieValue.slice(0, dotIndex);
  const signature = cookieValue.slice(dotIndex + 1);
  if (!encoded || !signature) {
    return null;
  }

  const session = decodeSessionPayload(encoded);
  if (!session) {
    return null;
  }

  const expectedSignature = signPayload(encoded, resolved);

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

  if (session.iat - nowSec > SESSION_MAX_CLOCK_SKEW_SEC) {
    return null;
  }

  if (nowSec - session.iat > SESSION_MAX_AGE_SEC) {
    return null;
  }

  return session.userId;
}

export function getSignedUserCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
    secure: process.env.NODE_ENV === "production",
  };
}
