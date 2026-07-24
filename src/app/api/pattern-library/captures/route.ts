import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ohlcvBarSchema,
  parsePatternId,
  patternRecordSchema,
} from "@/lib/patternLibrary/types";
import { resolvePatternLibraryStoreForRequest } from "@/lib/patternLibrary/patternLibraryStore";
import {
  patternLibraryAuthResponse,
  patternLibraryInvalidIdResponse,
} from "@/lib/patternLibrary/routeErrors";

export const runtime = "nodejs";

const saveCaptureBodySchema = z.object({
  record: patternRecordSchema,
  renderBars: z.array(ohlcvBarSchema).min(2).optional(),
  leftPaddingApplied: z.number().int().min(0).max(20).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id query parameter" }, { status: 400 });
  }

  try {
    parsePatternId(id);
    const store = await resolvePatternLibraryStoreForRequest();
    const record = await store.loadRecord(id);
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, record });
  } catch (error) {
    const auth = patternLibraryAuthResponse(error);
    if (auth) return auth;
    const invalid = patternLibraryInvalidIdResponse(error);
    if (invalid) return invalid;
    return NextResponse.json({ error: "Invalid pattern id" }, { status: 400 });
  }
}

export async function POST(request: Request) {
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

  const { record, renderBars, leftPaddingApplied } = parsed.data;
  if (!record.capture) {
    return NextResponse.json({ error: "Record must include capture metadata" }, { status: 400 });
  }

  try {
    const store = await resolvePatternLibraryStoreForRequest();
    await store.saveRecord(record, {
      writeSvg: true,
      renderBars: renderBars ?? record.ohlcv,
      leftPaddingApplied,
    });
    return NextResponse.json({ ok: true, id: record.id });
  } catch (error) {
    const auth = patternLibraryAuthResponse(error);
    if (auth) return auth;
    const invalid = patternLibraryInvalidIdResponse(error);
    if (invalid) return invalid;
    throw error;
  }
}
