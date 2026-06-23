import "server-only";

import { isDatabaseConfigured } from "@/db";
import { AuthSecretMissingError } from "@/lib/persistence/auth/devSessionCookie";
import { getCurrentUser } from "@/lib/persistence/auth/getCurrentUser";
import { persistenceError } from "@/lib/persistence/common";

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
    user = await getCurrentUser();
  } catch (error) {
    if (error instanceof AuthSecretMissingError) {
      return persistenceError(
        503,
        "database_unavailable",
        "Persistence auth is not configured. Set EDGE_AUTH_SECRET to enable cloud sync.",
      );
    }
    throw error;
  }

  if (!user) {
    return persistenceError(401, "unauthorized", "Unable to resolve current user.");
  }

  return handler(user.id);
}

export function conflictResponse(
  current: Record<string, unknown> & { syncRevision: number; updatedAt: string },
) {
  return persistenceError(409, "conflict", "Revision conflict.", {
    current,
  });
}
