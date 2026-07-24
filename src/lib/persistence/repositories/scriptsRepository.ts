import "server-only";

import { createHash, randomUUID } from "node:crypto";

import {
  DEFAULT_SCRIPT_RUNTIME_BUDGETS,
  SCRIPT_LANGUAGE_VERSION,
  SCRIPT_SDK_VERSION,
  type ScriptManifest,
} from "@edge/chart-core";
import { and, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { userScriptRevisions, userScripts } from "@/db/schema";
import { normalizeScriptSource } from "@/lib/scriptLibrary/hash";
import type {
  ScriptDraft,
  ScriptLibraryEntry,
  ScriptRevisionRecord,
} from "@/lib/scriptLibrary/types";
import {
  DEFAULT_SCRIPT_TEMPLATE,
  MAX_REVISIONS_PER_SCRIPT,
  MAX_SCRIPTS,
} from "@/lib/scriptLibrary/types";

export function computeServerRevisionFromSource(source: string): string {
  const normalized = normalizeScriptSource(source);
  const payload = `${SCRIPT_LANGUAGE_VERSION}\0${SCRIPT_SDK_VERSION}\0${normalized}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

function assertSourceWithinBudget(source: string): void {
  const bytes = new TextEncoder().encode(source).byteLength;
  if (bytes > DEFAULT_SCRIPT_RUNTIME_BUDGETS.maxSourceBytes) {
    throw new Error(`Script exceeds ${DEFAULT_SCRIPT_RUNTIME_BUDGETS.maxSourceBytes} byte limit`);
  }
}

function rowToRevisionRecord(row: typeof userScriptRevisions.$inferSelect): ScriptRevisionRecord {
  return {
    revision: row.revision,
    source: row.source,
    languageVersion: row.languageVersion as typeof SCRIPT_LANGUAGE_VERSION,
    sdkVersion: row.sdkVersion as typeof SCRIPT_SDK_VERSION,
    manifest: row.manifest as ScriptManifest | undefined,
    artifactHash: row.artifactHash ?? undefined,
    compiledAt: row.compiledAt.getTime(),
    compileOk: row.compileOk,
  };
}

function rowToEntry(
  scriptRow: typeof userScripts.$inferSelect,
  revisionRows: (typeof userScriptRevisions.$inferSelect)[],
): ScriptLibraryEntry {
  const draft: ScriptDraft | undefined =
    scriptRow.draftSource != null
      ? {
          source: scriptRow.draftSource,
          updatedAt: scriptRow.draftUpdatedAt?.getTime() ?? scriptRow.updatedAt.getTime(),
          dirty: scriptRow.draftDirty,
          manifest: (scriptRow.draftManifest as ScriptManifest | null) ?? undefined,
        }
      : undefined;

  return {
    scriptId: scriptRow.scriptId,
    displayName: scriptRow.displayName,
    createdAt: scriptRow.createdAt.getTime(),
    updatedAt: scriptRow.updatedAt.getTime(),
    headRevision: scriptRow.headRevision,
    draft,
    revisions: revisionRows.map(rowToRevisionRecord),
  };
}

export type ScriptListItem = {
  scriptId: string;
  displayName: string;
  headRevision: string | null;
  updatedAt: number;
  dirty: boolean;
  hasDraft: boolean;
  compileOk: boolean;
  revisionCount: number;
};

export async function listUserScripts(userId: string): Promise<ScriptListItem[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userScripts)
    .where(eq(userScripts.userId, userId))
    .orderBy(desc(userScripts.updatedAt));

  const items: ScriptListItem[] = [];
  for (const row of rows) {
    const revisionRows = await db
      .select()
      .from(userScriptRevisions)
      .where(and(eq(userScriptRevisions.userId, userId), eq(userScriptRevisions.scriptId, row.scriptId)));
    const headRecord = row.headRevision
      ? revisionRows.find((rev) => rev.revision === row.headRevision)
      : undefined;
    items.push({
      scriptId: row.scriptId,
      displayName: row.displayName,
      headRevision: row.headRevision,
      updatedAt: row.updatedAt.getTime(),
      dirty: row.draftDirty,
      hasDraft: row.draftSource != null,
      compileOk: headRecord?.compileOk ?? false,
      revisionCount: revisionRows.length,
    });
  }
  return items;
}

export async function getUserScriptEntry(
  userId: string,
  scriptId: string,
): Promise<ScriptLibraryEntry | null> {
  const db = getDb();
  const scriptRows = await db
    .select()
    .from(userScripts)
    .where(and(eq(userScripts.userId, userId), eq(userScripts.scriptId, scriptId)))
    .limit(1);
  const scriptRow = scriptRows[0];
  if (!scriptRow) return null;

  const revisionRows = await db
    .select()
    .from(userScriptRevisions)
    .where(and(eq(userScriptRevisions.userId, userId), eq(userScriptRevisions.scriptId, scriptId)))
    .orderBy(desc(userScriptRevisions.compiledAt));

  return rowToEntry(scriptRow, revisionRows);
}

export async function countUserScripts(userId: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userScripts)
    .where(eq(userScripts.userId, userId));
  return rows[0]?.count ?? 0;
}

export async function createUserScript(
  userId: string,
  params?: { displayName?: string; source?: string; scriptId?: string },
): Promise<ScriptLibraryEntry> {
  const count = await countUserScripts(userId);
  if (count >= MAX_SCRIPTS) {
    throw new Error(`Script library limit reached (${MAX_SCRIPTS})`);
  }

  const now = new Date();
  const source = normalizeScriptSource(params?.source ?? DEFAULT_SCRIPT_TEMPLATE);
  assertSourceWithinBudget(source);
  const scriptId = params?.scriptId ?? randomUUID();

  const db = getDb();
  await db.insert(userScripts).values({
    userId,
    scriptId,
    displayName: params?.displayName?.trim() || "Untitled script",
    headRevision: null,
    draftSource: source,
    draftManifest: null,
    draftDirty: true,
    draftUpdatedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  const entry = await getUserScriptEntry(userId, scriptId);
  if (!entry) throw new Error("Failed to create script");
  return entry;
}

export async function patchUserScript(
  userId: string,
  scriptId: string,
  patch: {
    displayName?: string;
    draftSource?: string;
    draftManifest?: ScriptManifest;
    draftDirty?: boolean;
  },
): Promise<ScriptLibraryEntry | null> {
  const existing = await getUserScriptEntry(userId, scriptId);
  if (!existing) return null;

  const now = new Date();
  const updates: Partial<typeof userScripts.$inferInsert> = { updatedAt: now };

  if (patch.displayName !== undefined) {
    const trimmed = patch.displayName.trim();
    if (!trimmed) throw new Error("displayName cannot be empty");
    updates.displayName = trimmed;
  }

  if (patch.draftSource !== undefined) {
    const normalized = normalizeScriptSource(patch.draftSource);
    assertSourceWithinBudget(normalized);
    updates.draftSource = normalized;
    updates.draftUpdatedAt = now;
    updates.draftDirty = patch.draftDirty ?? true;
  }

  if (patch.draftManifest !== undefined) {
    updates.draftManifest = patch.draftManifest;
  }

  if (patch.draftDirty !== undefined && patch.draftSource === undefined) {
    updates.draftDirty = patch.draftDirty;
  }

  const db = getDb();
  await db
    .update(userScripts)
    .set(updates)
    .where(and(eq(userScripts.userId, userId), eq(userScripts.scriptId, scriptId)));

  return getUserScriptEntry(userId, scriptId);
}

export async function saveUserScriptRevision(
  userId: string,
  scriptId: string,
  params: {
    source: string;
    languageVersion?: string;
    sdkVersion?: string;
    manifest?: ScriptManifest;
    artifactHash?: string;
    compileOk: boolean;
  },
): Promise<{ entry: ScriptLibraryEntry; revision: string } | null> {
  const existing = await getUserScriptEntry(userId, scriptId);
  if (!existing) return null;

  const normalized = normalizeScriptSource(params.source);
  assertSourceWithinBudget(normalized);
  const revision = computeServerRevisionFromSource(normalized);
  const now = new Date();
  const languageVersion = params.languageVersion ?? SCRIPT_LANGUAGE_VERSION;
  const sdkVersion = params.sdkVersion ?? SCRIPT_SDK_VERSION;

  const db = getDb();
  await db
    .insert(userScriptRevisions)
    .values({
      userId,
      scriptId,
      revision,
      source: normalized,
      languageVersion,
      sdkVersion,
      manifest: params.manifest ?? null,
      artifactHash: params.artifactHash ?? null,
      compileOk: params.compileOk,
      compiledAt: now,
    })
    .onConflictDoUpdate({
      target: [
        userScriptRevisions.userId,
        userScriptRevisions.scriptId,
        userScriptRevisions.revision,
      ],
      set: {
        source: normalized,
        languageVersion,
        sdkVersion,
        manifest: params.manifest ?? null,
        artifactHash: params.artifactHash ?? null,
        compileOk: params.compileOk,
        compiledAt: now,
      },
    });

  const allRevisions = await db
    .select()
    .from(userScriptRevisions)
    .where(and(eq(userScriptRevisions.userId, userId), eq(userScriptRevisions.scriptId, scriptId)))
    .orderBy(desc(userScriptRevisions.compiledAt));

  if (allRevisions.length > MAX_REVISIONS_PER_SCRIPT) {
    const toDelete = allRevisions.slice(MAX_REVISIONS_PER_SCRIPT);
    for (const row of toDelete) {
      await db
        .delete(userScriptRevisions)
        .where(
          and(
            eq(userScriptRevisions.userId, userId),
            eq(userScriptRevisions.scriptId, scriptId),
            eq(userScriptRevisions.revision, row.revision),
          ),
        );
    }
  }

  await db
    .update(userScripts)
    .set({
      headRevision: revision,
      draftSource: null,
      draftManifest: null,
      draftDirty: false,
      draftUpdatedAt: null,
      updatedAt: now,
    })
    .where(and(eq(userScripts.userId, userId), eq(userScripts.scriptId, scriptId)));

  const entry = await getUserScriptEntry(userId, scriptId);
  if (!entry) return null;
  return { entry, revision };
}

export async function getUserScriptRevision(
  userId: string,
  scriptId: string,
  revision: string,
): Promise<ScriptRevisionRecord | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userScriptRevisions)
    .where(
      and(
        eq(userScriptRevisions.userId, userId),
        eq(userScriptRevisions.scriptId, scriptId),
        eq(userScriptRevisions.revision, revision),
      ),
    )
    .limit(1);
  const row = rows[0];
  return row ? rowToRevisionRecord(row) : null;
}

export async function deleteUserScript(userId: string, scriptId: string): Promise<boolean> {
  const db = getDb();
  const result = await db
    .delete(userScripts)
    .where(and(eq(userScripts.userId, userId), eq(userScripts.scriptId, scriptId)))
    .returning({ scriptId: userScripts.scriptId });
  return result.length > 0;
}

export async function importScriptLibraryEntries(
  userId: string,
  entries: ScriptLibraryEntry[],
): Promise<number> {
  let imported = 0;
  for (const entry of entries) {
    const existing = await getUserScriptEntry(userId, entry.scriptId);
    if (existing) continue;

    const initialSource =
      entry.draft?.source ??
      entry.revisions.find((r) => r.revision === entry.headRevision)?.source ??
      DEFAULT_SCRIPT_TEMPLATE;

    await createUserScript(userId, {
      scriptId: entry.scriptId,
      displayName: entry.displayName,
      source: initialSource,
    });

    if (entry.draft?.manifest) {
      await patchUserScript(userId, entry.scriptId, {
        draftManifest: entry.draft.manifest,
        draftDirty: entry.draft.dirty,
      });
    }

    for (const rev of entry.revisions) {
      await saveUserScriptRevision(userId, entry.scriptId, {
        source: rev.source,
        languageVersion: rev.languageVersion,
        sdkVersion: rev.sdkVersion,
        manifest: rev.manifest,
        artifactHash: rev.artifactHash,
        compileOk: rev.compileOk,
      });
    }

    if (entry.headRevision) {
      const db = getDb();
      await db
        .update(userScripts)
        .set({
          headRevision: entry.headRevision,
          updatedAt: new Date(entry.updatedAt),
          createdAt: new Date(entry.createdAt),
        })
        .where(and(eq(userScripts.userId, userId), eq(userScripts.scriptId, entry.scriptId)));
    }

    imported += 1;
  }
  return imported;
}
