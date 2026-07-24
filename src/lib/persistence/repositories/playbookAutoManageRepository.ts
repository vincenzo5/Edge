import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { playbookAutoManage } from "@/db/schema";
import {
  DEFAULT_PLAYBOOK_AUTO_MANAGE,
  mergePlaybookAutoManagePatch,
  type PatchPlaybookAutoManageInput,
  type PlaybookAutoManageSettings,
  PlaybookAutoManageSettingsSchema,
} from "@/lib/trading/playbookAutoManageStore";

function rowToSettings(row: typeof playbookAutoManage.$inferSelect): PlaybookAutoManageSettings {
  return PlaybookAutoManageSettingsSchema.parse({
    paperEnabled: row.paperEnabled,
    liveEnabled: row.liveEnabled,
    liveConsentAt: row.liveConsentAt?.toISOString(),
  });
}

export async function getPlaybookAutoManageSettings(
  userId: string,
): Promise<PlaybookAutoManageSettings> {
  const db = getDb();
  const rows = await db
    .select()
    .from(playbookAutoManage)
    .where(eq(playbookAutoManage.userId, userId))
    .limit(1);
  if (!rows[0]) return DEFAULT_PLAYBOOK_AUTO_MANAGE;
  return rowToSettings(rows[0]);
}

export async function patchPlaybookAutoManageSettings(
  userId: string,
  patch: PatchPlaybookAutoManageInput,
): Promise<PlaybookAutoManageSettings> {
  const db = getDb();
  const existing = await getPlaybookAutoManageSettings(userId);
  const next = mergePlaybookAutoManagePatch(existing, patch);
  const now = new Date();

  await db
    .insert(playbookAutoManage)
    .values({
      userId,
      paperEnabled: next.paperEnabled,
      liveEnabled: next.liveEnabled,
      liveConsentAt: next.liveConsentAt ? new Date(next.liveConsentAt) : null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: playbookAutoManage.userId,
      set: {
        paperEnabled: next.paperEnabled,
        liveEnabled: next.liveEnabled,
        liveConsentAt: next.liveConsentAt ? new Date(next.liveConsentAt) : null,
        updatedAt: now,
      },
    });

  return next;
}
