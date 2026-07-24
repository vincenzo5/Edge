import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { copilotThreadCreateSchema } from "@/lib/persistence/schemas/copilotThreads";
import {
  createCopilotThread,
  listCopilotThreads,
} from "@/lib/persistence/repositories/copilotThreadsRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET() {
  return withPersistenceAuth(async (userId) => {
    const threads = await listCopilotThreads(userId);
    return NextResponse.json({ threads });
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

    const parsed = parseJsonBody(body, copilotThreadCreateSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const thread = await createCopilotThread({
      userId,
      id: parsed.data.id,
      title: parsed.data.title,
      messages: parsed.data.messages,
      modelId: parsed.data.modelId,
    });

    return NextResponse.json({
      id: thread.id,
      title: thread.title,
      schemaVersion: thread.schemaVersion,
      syncRevision: thread.syncRevision,
      updatedAt: thread.updatedAt,
      messages: thread.messages,
      ...(thread.modelId ? { modelId: thread.modelId } : {}),
    });
  });
}
