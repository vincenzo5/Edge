import { NextResponse } from "next/server";

import { checkReadiness } from "@/lib/observability/readiness";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const result = await checkReadiness();
  if (result.ok) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json(
    { ok: false, reasons: result.reasons },
    { status: 503 },
  );
}
