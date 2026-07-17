import "server-only";

import { NextResponse } from "next/server";

import { isDatabaseConfigured } from "@/db";
import { runBrokerageIngestAll } from "@/lib/brokerage/ingest/runBrokerageIngest";
import { getCurrentUser } from "@/lib/persistence/auth/getCurrentUser";
import { ensureDevAppUser } from "@/lib/persistence/repositories/appUserRepository";

export const runtime = "nodejs";

function readCronSecret(request: Request): string | null {
  const header =
    request.headers.get("x-edge-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;
  return header?.trim() || null;
}

async function resolveIngestUser(request: Request): Promise<string | null> {
  const configuredSecret = process.env.EDGE_CRON_SECRET?.trim();
  if (configuredSecret) {
    const provided = readCronSecret(request);
    if (provided === configuredSecret) {
      return ensureDevAppUser();
    }
  }

  const user = await getCurrentUser();
  if (user) return user.id;

  if (!configuredSecret && isDatabaseConfigured()) {
    return ensureDevAppUser();
  }

  return null;
}

async function handleIngest(request: Request): Promise<Response> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "database_unavailable", results: [] },
      { status: 503 },
    );
  }

  const userId = await resolveIngestUser(request);
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
