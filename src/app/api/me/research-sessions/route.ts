import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { researchSessionCreateSchema } from "@/lib/persistence/schemas/researchSessions";
import {
  createResearchSession,
  listResearchSessions,
} from "@/lib/persistence/repositories/researchSessionsRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET() {
  return withPersistenceAuth(async (userId) => {
    const sessions = await listResearchSessions(userId);
    return NextResponse.json({ sessions });
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

    const parsed = parseJsonBody(body, researchSessionCreateSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const session = await createResearchSession({
      userId,
      id: parsed.data.id,
      title: parsed.data.title,
      question: parsed.data.question,
      cards: parsed.data.cards,
      links: parsed.data.links,
      threadIds: parsed.data.threadIds,
      reel: parsed.data.reel,
    });

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
