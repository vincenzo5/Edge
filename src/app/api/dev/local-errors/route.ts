import { NextResponse } from "next/server";
import { z } from "zod";

import { assertLocalErrorsAccess } from "@/lib/api/localErrorsAccess";
import {
  appendLocalError,
  readLocalErrorLog,
} from "@/lib/observability/localErrorLog";

const postBodySchema = z.object({
  source: z.string().min(1).max(64),
  message: z.string().min(1).max(500),
  stack: z.string().max(4000).optional(),
  detail: z.string().max(500).optional(),
});

export async function POST(request: Request): Promise<Response> {
  const denied = assertLocalErrorsAccess(request);
  if (denied) return denied;

  try {
    const body = postBodySchema.parse(await request.json());
    const entry = appendLocalError(body);
    if (!entry) {
      return NextResponse.json({ ok: false, error: "Failed to append local error log" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function GET(request: Request): Promise<Response> {
  const denied = assertLocalErrorsAccess(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 50;
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : 50;
  const entries = readLocalErrorLog(Math.min(Math.max(limit, 1), 200));
  return NextResponse.json({ ok: true, entries });
}
