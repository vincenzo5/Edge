import "server-only";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { appUsers } from "@/db/schema";
import {
  createSignedUserCookieValue,
  EDGE_USER_COOKIE,
  getSignedUserCookieOptions,
} from "@/lib/persistence/auth/devSessionCookie";
import type { CurrentUser } from "@/lib/persistence/auth/getCurrentUser";
import { isPersistenceEnabled } from "@/lib/persistence/auth/getCurrentUser";
import { isPersistenceDatabaseUnavailable } from "@/lib/persistence/common";

export function isDevPassphraseRequired(): boolean {
  return Boolean(process.env.EDGE_DEV_PASSPHRASE?.trim());
}

function readDevPassphrase(): string | null {
  const value = process.env.EDGE_DEV_PASSPHRASE?.trim();
  return value || null;
}

export function validateDevPassphrase(passphrase: string): boolean {
  const expected = readDevPassphrase();
  if (!expected) {
    return true;
  }
  try {
    const a = Buffer.from(passphrase);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function findOrCreateDevUser(): Promise<CurrentUser> {
  const db = getDb();
  const email = process.env.EDGE_DEV_USER_EMAIL?.trim() || "dev@localhost";
  const existing = await db.select().from(appUsers).where(eq(appUsers.email, email)).limit(1);
  const row = existing[0];
  if (row) {
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
    };
  }

  const inserted = await db
    .insert(appUsers)
    .values({
      email,
      displayName: "Dev User",
    })
    .returning();
  const created = inserted[0];
  return {
    id: created.id,
    email: created.email,
    displayName: created.displayName,
  };
}

export type EstablishDevSessionInput = {
  passphrase?: string;
  bootstrap?: boolean;
};

export async function establishDevSession(
  input: EstablishDevSessionInput = {},
): Promise<CurrentUser | null> {
  if (!isPersistenceEnabled()) {
    return null;
  }

  if (isDevPassphraseRequired()) {
    if (input.bootstrap) {
      return null;
    }
    if (!input.passphrase || !validateDevPassphrase(input.passphrase)) {
      return null;
    }
  } else if (!input.bootstrap && !input.passphrase) {
    return null;
  }

  const user = await findOrCreateDevUser();
  const cookieStore = await cookies();
  cookieStore.set(
    EDGE_USER_COOKIE,
    createSignedUserCookieValue(user.id),
    getSignedUserCookieOptions(),
  );
  return user;
}

export async function clearDevSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(EDGE_USER_COOKIE, "", {
    ...getSignedUserCookieOptions(),
    maxAge: 0,
  });
}

export async function ensurePersistenceSession(): Promise<void> {
  if (!isPersistenceEnabled()) {
    return;
  }
  if (isDevPassphraseRequired()) {
    return;
  }
  const cookieStore = await cookies();
  const existing = cookieStore.get(EDGE_USER_COOKIE)?.value?.trim();
  if (existing) {
    return;
  }
  try {
    await establishDevSession({ bootstrap: true });
  } catch (error) {
    if (isPersistenceDatabaseUnavailable(error)) {
      return;
    }
    throw error;
  }
}
