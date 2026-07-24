import "server-only";

import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db";
import { copilotAttachments } from "@/db/schema";
import type { CopilotAttachmentSource } from "@/lib/copilot/attachmentValidation";
import {
  deleteCopilotAttachmentFile,
  readCopilotAttachmentFile,
  validateCopilotAttachmentUpload,
  writeCopilotAttachmentFile,
  copilotAttachmentStorageKey,
  type CopilotAttachmentMimeType,
} from "@/lib/copilot/attachmentStorage";
import type { CopilotAttachmentResponse } from "@/lib/persistence/schemas/copilotAttachments";

function rowToResponse(row: typeof copilotAttachments.$inferSelect): CopilotAttachmentResponse {
  return {
    id: row.id,
    mimeType: row.mimeType as CopilotAttachmentMimeType,
    byteSize: row.byteSize,
    name: row.name,
    source: row.source as CopilotAttachmentSource,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createCopilotAttachment(
  userId: string,
  input: {
    bytes: Buffer;
    mimeType: string;
    source: CopilotAttachmentSource;
    name?: string | null;
    existingCount?: number;
  },
): Promise<CopilotAttachmentResponse> {
  const validated = validateCopilotAttachmentUpload(
    input.mimeType,
    input.bytes.byteLength,
    input.existingCount ?? 0,
  );
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const attachmentId = randomUUID();
  const storageKey = copilotAttachmentStorageKey(userId, attachmentId, validated.mimeType);

  await writeCopilotAttachmentFile(storageKey, input.bytes);

  const db = getDb();
  try {
    const rows = await db
      .insert(copilotAttachments)
      .values({
        id: attachmentId,
        userId,
        mimeType: validated.mimeType,
        byteSize: input.bytes.byteLength,
        storageKey,
        name: input.name?.trim() || null,
        source: input.source,
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Attachment insert failed.");
    }
    return rowToResponse(row);
  } catch (error) {
    await deleteCopilotAttachmentFile(storageKey);
    throw error;
  }
}

export async function getCopilotAttachmentById(
  userId: string,
  attachmentId: string,
): Promise<(CopilotAttachmentResponse & { storageKey: string }) | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(copilotAttachments)
    .where(and(eq(copilotAttachments.id, attachmentId), eq(copilotAttachments.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...rowToResponse(row), storageKey: row.storageKey };
}

export async function readCopilotAttachmentBytes(
  userId: string,
  attachmentId: string,
): Promise<{ bytes: Buffer; mimeType: CopilotAttachmentMimeType } | null> {
  const row = await getCopilotAttachmentById(userId, attachmentId);
  if (!row) return null;
  const bytes = await readCopilotAttachmentFile(row.storageKey);
  return { bytes, mimeType: row.mimeType };
}

export async function deleteCopilotAttachment(
  userId: string,
  attachmentId: string,
): Promise<boolean> {
  const existing = await getCopilotAttachmentById(userId, attachmentId);
  if (!existing) return false;

  const db = getDb();
  await db
    .delete(copilotAttachments)
    .where(and(eq(copilotAttachments.id, attachmentId), eq(copilotAttachments.userId, userId)));
  await deleteCopilotAttachmentFile(existing.storageKey);
  return true;
}
