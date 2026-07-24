import "server-only";

import { NextResponse } from "next/server";
import { getCurrentUser, isPersistenceEnabled } from "@/lib/persistence/auth/getCurrentUser";
import { ensureDevAppUser } from "@/lib/persistence/repositories/appUserRepository";

export function readTradingServiceSecret(request: Request): string | null {
  const header = request.headers.get("x-edge-trading-service-secret")?.trim();
  if (header) return header;
  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }
  return null;
}

export async function resolveTradingMutateUser(request: Request): Promise<string | null> {
  if (!isPersistenceEnabled()) {
    return null;
  }

  const configuredSecret = process.env.EDGE_TRADING_SERVICE_SECRET?.trim();
  if (configuredSecret) {
    const provided = readTradingServiceSecret(request);
    if (provided === configuredSecret) {
      return ensureDevAppUser();
    }
  }

  const user = await getCurrentUser();
  if (user) return user.id;

  return null;
}

export function tradingMutateUnauthorizedResponse(): Response {
  return NextResponse.json(
    { error: "Authentication required for trading mutations." },
    { status: 401 },
  );
}

export async function requireTradingMutateAuth(request: Request): Promise<
  | { ok: true; userId: string | null }
  | { ok: false; response: Response }
> {
  const userId = await resolveTradingMutateUser(request);
  if (isPersistenceEnabled() && !userId) {
    return { ok: false, response: tradingMutateUnauthorizedResponse() };
  }
  return { ok: true, userId };
}
