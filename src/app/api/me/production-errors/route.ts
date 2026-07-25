import { NextResponse } from "next/server";
import { z } from "zod";

import {
  listProductionErrorEvents,
  normalizeProductionErrorListLimit,
} from "@/lib/persistence/repositories/productionErrorRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";
import {
  persistProductionError,
  purgeProductionErrorRetentionNow,
} from "@/lib/observability/productionErrorPersist";

export const runtime = "nodejs";

const postBodySchema = z.object({
  source: z.string().min(1).max(64),
  message: z.string().min(1).max(500),
  stack: z.string().max(4000).optional(),
  detail: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  return withPersistenceAuth(async (userId) => {
    try {
      const body = postBodySchema.parse(await request.json());
      await persistProductionError(body, { userId });
      return NextResponse.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid request";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  });
}

export async function GET(request: Request) {
  return withPersistenceAuth(async (userId) => {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = normalizeProductionErrorListLimit(
      limitParam ? Number.parseInt(limitParam, 10) : undefined,
    );

    await purgeProductionErrorRetentionNow();

    const events = await listProductionErrorEvents(userId, { limit });
    return NextResponse.json({ events });
  });
}
