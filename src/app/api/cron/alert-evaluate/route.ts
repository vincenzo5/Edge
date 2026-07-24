import "server-only";

import { NextResponse } from "next/server";

import { resolveCronUserId } from "@/lib/api/cronAuth";
import { isDatabaseConfigured } from "@/db";
import { runAlertEvaluation } from "@/lib/alerts/runAlertEvaluation";

export const runtime = "nodejs";

async function handleEvaluate(request: Request): Promise<Response> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "database_unavailable", evaluated: 0, triggered: 0 },
      { status: 503 },
    );
  }

  const userId = await resolveCronUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runAlertEvaluation();
  return NextResponse.json(result);
}

export async function GET(request: Request): Promise<Response> {
  return handleEvaluate(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleEvaluate(request);
}
