import "server-only";

import { isDatabaseConfigured } from "@/db";
import { establishDevSession, isDevPassphraseRequired } from "@/lib/persistence/auth/devSession";
import { AuthSecretMissingError } from "@/lib/persistence/auth/devSessionCookie";
import { getCurrentUser } from "@/lib/persistence/auth/getCurrentUser";
import { persistenceError, isPersistenceDatabaseUnavailable } from "@/lib/persistence/common";

function hasDatabaseUnavailableCause(error: unknown): boolean {
  return isPersistenceDatabaseUnavailable(error);
}

async function resolvePersistenceUser() {
  let user = await getCurrentUser();
  if (user || isDevPassphraseRequired()) {
    return user;
  }

  try {
    user = await establishDevSession({ bootstrap: true });
  } catch (error) {
    if (hasDatabaseUnavailableCause(error)) {
      return null;
    }
    throw error;
  }

  return user;
}

export async function withPersistenceAuth<T>(
  handler: (userId: string) => Promise<T>,
): Promise<Response | T> {
  if (!isDatabaseConfigured()) {
    return persistenceError(
      503,
      "database_unavailable",
      "Persistence is not configured. Set DATABASE_URL to enable cloud sync.",
    );
  }

  let user;
  try {
    user = await resolvePersistenceUser();
  } catch (error) {
    if (error instanceof AuthSecretMissingError) {
      return persistenceError(
        503,
        "database_unavailable",
        "Persistence auth is not configured. Set EDGE_AUTH_SECRET to enable cloud sync.",
      );
    }
    if (hasDatabaseUnavailableCause(error)) {
      return persistenceError(
        503,
        "database_unavailable",
        "Persistence database is unavailable. Local storage fallback remains active.",
      );
    }
    throw error;
  }

  if (!user) {
    return persistenceError(401, "unauthorized", "Unable to resolve current user.");
  }

  try {
    return await handler(user.id);
  } catch (error) {
    if (hasDatabaseUnavailableCause(error)) {
      return persistenceError(
        503,
        "database_unavailable",
        "Persistence database is unavailable. Local storage fallback remains active.",
      );
    }
    throw error;
  }
}

export function conflictResponse(
  current: Record<string, unknown> & { syncRevision: number; updatedAt: string },
) {
  return persistenceError(409, "conflict", "Revision conflict.", {
    current,
  });
}
