import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { researchSessionWriteSchema } from "@/lib/persistence/schemas/researchSessions";
import {
  archiveResearchSession,
  getResearchSessionById,
  saveResearchSession,
} from "@/lib/persistence/repositories/researchSessionsRepository";
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
    const session = await getResearchSessionById(userId, id, { includeArchived: true });
    if (!session) {
      return persistenceError(404, "not_found", "Research session not found.");
    }

    return NextResponse.json({
      id: session.id,
      title: session.title,
      schemaVersion: session.schemaVersion,
      syncRevision: session.syncRevision,
      updatedAt: session.updatedAt,
      ...(session.question ? { question: session.question } : {}),
      cards: session.cards,
      links: session.links,
      threadIds: session.threadIds,
      reel: session.reel,
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

    const parsed = parseJsonBody(body, researchSessionWriteSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const existing = await getResearchSessionById(userId, id);
    if (!existing) {
      return persistenceError(404, "not_found", "Research session not found.");
    }

    const result = await saveResearchSession({
      userId,
      sessionId: id,
      title: parsed.data.title,
      question: parsed.data.question,
      cards: parsed.data.cards,
      links: parsed.data.links,
      threadIds: parsed.data.threadIds,
      reel: parsed.data.reel,
      baseRevision: parsed.data.baseRevision,
    });

    if (!result.ok) {
      if (result.code === "not_found") {
        return persistenceError(404, "not_found", "Research session not found.");
      }
      if (result.current) {
        return conflictResponse({
          syncRevision: result.current.syncRevision,
          updatedAt: result.current.updatedAt,
          title: result.current.title,
          question: result.current.question,
          cards: result.current.cards,
          links: result.current.links,
          threadIds: result.current.threadIds,
          reel: result.current.reel,
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
      ...(result.record.question ? { question: result.record.question } : {}),
      cards: result.record.cards,
      links: result.record.links,
      threadIds: result.record.threadIds,
      reel: result.record.reel,
    });
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  return withPersistenceAuth(async (userId) => {
    const result = await archiveResearchSession(userId, id);
    if (!result.ok) {
      if (result.code === "not_found") {
        return persistenceError(404, "not_found", "Research session not found.");
      }
      return persistenceError(409, "conflict", "Cannot archive session.");
    }

    return NextResponse.json({ ok: true });
  });
}
