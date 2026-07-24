import { NextResponse } from "next/server";
import { z } from "zod";

import { parsePatternId, setupQualitySchema } from "@/lib/patternLibrary/types";
import { resolvePatternLibraryStoreForRequest } from "@/lib/patternLibrary/patternLibraryStore";
import {
  patternLibraryAuthResponse,
  patternLibraryInvalidIdResponse,
} from "@/lib/patternLibrary/routeErrors";

export const runtime = "nodejs";

const patchRecordBodySchema = z
  .object({
    setupFamilyId: z.string().min(1).optional(),
    quality: setupQualitySchema.optional(),
    notes: z.string().optional(),
    thesis: z.string().optional(),
  })
  .refine(
    (value) =>
      value.setupFamilyId != null ||
      value.quality != null ||
      value.notes != null ||
      value.thesis != null,
    { message: "At least one field must be provided" },
  );

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
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

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = patchRecordBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    parsePatternId(id);
    const store = await resolvePatternLibraryStoreForRequest();
    const record = await store.patchRecordMetadata(id, parsed.data);
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
