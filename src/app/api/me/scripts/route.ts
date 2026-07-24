import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { createScriptBodySchema } from "@/lib/persistence/schemas/scripts";
import {
  countUserScripts,
  createUserScript,
  listUserScripts,
} from "@/lib/persistence/repositories/scriptsRepository";
import { importLegacyScriptLibrarySnapshot } from "@/lib/persistence/repositories/scriptsLegacyImport";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

async function ensureMigrated(userId: string): Promise<void> {
  const count = await countUserScripts(userId);
  if (count > 0) return;
  await importLegacyScriptLibrarySnapshot(userId);
}

export async function GET() {
  return withPersistenceAuth(async (userId) => {
    await ensureMigrated(userId);
    const scripts = await listUserScripts(userId);
    return NextResponse.json({ scripts });
  });
}

export async function POST(request: Request) {
  return withPersistenceAuth(async (userId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return persistenceError(400, "validation", "Request body must be valid JSON.");
    }

    const parsed = parseJsonBody(body, createScriptBodySchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    try {
      const entry = await createUserScript(userId, parsed.data);
      return NextResponse.json({ script: entry }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create script";
      return persistenceError(400, "validation", message);
    }
  });
}
