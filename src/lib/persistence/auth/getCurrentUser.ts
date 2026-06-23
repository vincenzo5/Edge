import "server-only";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { getDb, isDatabaseConfigured } from "@/db";
import { appUsers } from "@/db/schema";
import {
  AuthSecretMissingError,
  createSignedUserCookieValue,
  EDGE_USER_COOKIE,
  getSignedUserCookieOptions,
  verifySignedUserCookieValue,
} from "@/lib/persistence/auth/devSessionCookie";

export { EDGE_USER_COOKIE };

export type CurrentUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

export function isPersistenceEnabled(): boolean {
  return isDatabaseConfigured();
}

async function findUserById(userId: string): Promise<CurrentUser | null> {
  const db = getDb();
  const rows = await db.select().from(appUsers).where(eq(appUsers.id, userId)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
  };
}

async function createDevUser(): Promise<CurrentUser> {
  const db = getDb();
  const email = process.env.EDGE_DEV_USER_EMAIL?.trim() || "dev@localhost";
  const rows = await db
    .insert(appUsers)
    .values({
      email,
      displayName: "Dev User",
    })
    .returning();
  const row = rows[0];
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
  };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isPersistenceEnabled()) {
    return null;
  }

  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(EDGE_USER_COOKIE)?.value?.trim();

  if (existingCookie) {
    try {
      const verifiedUserId = verifySignedUserCookieValue(existingCookie);
      if (verifiedUserId) {
        const user = await findUserById(verifiedUserId);
        if (user) {
          return user;
        }
      }
    } catch (error) {
      if (error instanceof AuthSecretMissingError) {
        throw error;
      }
    }
  }

  const user = await createDevUser();
  cookieStore.set(EDGE_USER_COOKIE, createSignedUserCookieValue(user.id), getSignedUserCookieOptions());
  return user;
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Persistence is not configured");
  }
  return user;
}
