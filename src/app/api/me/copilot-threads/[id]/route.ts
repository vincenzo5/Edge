import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { copilotThreadWriteSchema } from "@/lib/persistence/schemas/copilotThreads";
import {
  archiveCopilotThread,
  getCopilotThreadById,
  saveCopilotThread,
} from "@/lib/persistence/repositories/copilotThreadsRepository";
import {
  conflictResponse,
  withPersistenceAuth,
} from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  return withPersistenceAuth(async (userId) => {
    const thread = await getCopilotThreadById(userId, id, { includeArchived: true });
    if (!thread) {
      return persistenceError(404, "not_found", "Copilot thread not found.");
    }

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

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;

  return withPersistenceAuth(async (userId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return persistenceError(400, "validation", "Request body must be valid JSON.");
    }

    const parsed = parseJsonBody(body, copilotThreadWriteSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const existing = await getCopilotThreadById(userId, id);
    if (!existing) {
      return persistenceError(404, "not_found", "Copilot thread not found.");
    }

    const result = await saveCopilotThread({
      userId,
      threadId: id,
      title: parsed.data.title,
      messages: parsed.data.messages,
      baseRevision: parsed.data.baseRevision,
      modelId: parsed.data.modelId,
    });

    if (!result.ok) {
      if (result.code === "not_found") {
        return persistenceError(404, "not_found", "Copilot thread not found.");
      }
      if (result.current) {
        return conflictResponse({
          syncRevision: result.current.syncRevision,
          updatedAt: result.current.updatedAt,
          messages: result.current.messages,
          title: result.current.title,
          ...(result.current.modelId ? { modelId: result.current.modelId } : {}),
        });
      }
      return persistenceError(409, "conflict", "Revision conflict.");
    }

    return NextResponse.json({
      id: result.record.id,
      title: result.record.title,
      schemaVersion: result.record.schemaVersion,
      syncRevision: result.record.syncRevision,
      updatedAt: result.record.updatedAt,
      messages: result.record.messages,
      ...(result.record.modelId ? { modelId: result.record.modelId } : {}),
    });
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  return withPersistenceAuth(async (userId) => {
    const result = await archiveCopilotThread(userId, id);
    if (!result.ok) {
      if (result.code === "not_found") {
        return persistenceError(404, "not_found", "Copilot thread not found.");
      }
      return persistenceError(409, "conflict", "Cannot archive thread.");
    }

    return NextResponse.json({ ok: true });
  });
}
