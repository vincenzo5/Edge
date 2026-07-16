import "server-only";

import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

import { getDb } from "@/db";
import { appUsers } from "@/db/schema";

export async function ensureAppUser(userId: string): Promise<void> {
  const db = getDb();
  const rows = await db.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.id, userId)).limit(1);
  if (rows[0]) return;

  await db.insert(appUsers).values({
    id: userId,
    email: process.env.EDGE_DEV_USER_EMAIL?.trim() || "dev@localhost",
    displayName: "Dev User",
  });
}

/** Stable dev user for server-side trading intents when no session cookie is present. */
export async function ensureDevAppUser(): Promise<string> {
  const email = process.env.EDGE_DEV_USER_EMAIL?.trim() || "dev@localhost";
  const db = getDb();
  const existing = await db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(eq(appUsers.email, email))
    .limit(1);
  if (existing[0]) return existing[0].id;

  const userId = randomUUID();
  await db.insert(appUsers).values({
    id: userId,
    email,
    displayName: "Dev User",
  });
  return userId;
}
