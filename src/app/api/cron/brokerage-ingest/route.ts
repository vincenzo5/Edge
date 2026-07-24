import "server-only";

import { NextResponse } from "next/server";

import { resolveCronUserId } from "@/lib/api/cronAuth";
import { isDatabaseConfigured } from "@/db";
import { runBrokerageIngestAll } from "@/lib/brokerage/ingest/runBrokerageIngest";

export const runtime = "nodejs";

async function handleIngest(request: Request): Promise<Response> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "database_unavailable", results: [] },
      { status: 503 },
    );
  }

  const userId = await resolveCronUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results = await runBrokerageIngestAll(userId);
  return NextResponse.json({ results });
}

export async function GET(request: Request): Promise<Response> {
  return handleIngest(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleIngest(request);
}
