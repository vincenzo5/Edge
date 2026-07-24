import "server-only";

import { sql } from "drizzle-orm";

import { getDb } from "@/db";
import type { ScriptLibrarySnapshot } from "@/lib/persistence/schemas/scriptLibrary";
import { importScriptLibraryEntries } from "@/lib/persistence/repositories/scriptsRepository";
import type { ScriptLibraryEntry } from "@/lib/scriptLibrary/types";

/** One-time import from legacy user_script_library JSON snapshot table. */
export async function importLegacyScriptLibrarySnapshot(userId: string): Promise<number> {
  const db = getDb();
  try {
    const result = await db.execute<{ script_library_snapshot: ScriptLibrarySnapshot }>(sql`
      SELECT script_library_snapshot
      FROM user_script_library
      WHERE user_id = ${userId}::uuid
      LIMIT 1
    `);
    const row = result.rows[0];
    if (!row?.script_library_snapshot?.scripts?.length) {
      return 0;
    }
    return importScriptLibraryEntries(
      userId,
      row.script_library_snapshot.scripts as ScriptLibraryEntry[],
    );
  } catch {
    return 0;
  }
}
