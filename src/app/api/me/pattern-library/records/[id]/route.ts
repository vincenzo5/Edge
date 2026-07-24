import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getPatternRecord,
  patchPatternRecordMetadata,
} from "@/lib/persistence/repositories/patternLibraryRepository";
import { setupQualitySchema } from "@/lib/patternLibrary/types";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

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
  return withPersistenceAuth(async (userId) => {
    const { id } = await context.params;
    const record = await getPatternRecord(userId, id);
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, record });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withPersistenceAuth(async (userId) => {
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

    const record = await patchPatternRecordMetadata(userId, id, parsed.data);
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, record });
  });
}
