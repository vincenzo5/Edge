import "server-only";

import { eq } from "drizzle-orm";

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
