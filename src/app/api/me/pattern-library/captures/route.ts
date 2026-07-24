import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getPatternRecord,
  upsertPatternRecord,
} from "@/lib/persistence/repositories/patternLibraryRepository";
import {
  ohlcvBarSchema,
  patternRecordSchema,
} from "@/lib/patternLibrary/types";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

const saveCaptureBodySchema = z.object({
  record: patternRecordSchema,
  renderBars: z.array(ohlcvBarSchema).min(2).optional(),
  leftPaddingApplied: z.number().int().min(0).max(20).optional(),
});

export async function GET(request: Request) {
  return withPersistenceAuth(async (userId) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id query parameter" }, { status: 400 });
    }
    const record = await getPatternRecord(userId, id);
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, record });
  });
}

export async function POST(request: Request) {
  return withPersistenceAuth(async (userId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    const parsed = saveCaptureBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { record } = parsed.data;
    if (!record.capture) {
      return NextResponse.json({ error: "Record must include capture metadata" }, { status: 400 });
    }

    await upsertPatternRecord(userId, record);
    return NextResponse.json({ ok: true, id: record.id });
  });
}
