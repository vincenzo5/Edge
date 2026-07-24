import { NextResponse } from "next/server";

import { resolvePatternLibraryStoreForRequest } from "@/lib/patternLibrary/patternLibraryStore";
import { patternLibraryAuthResponse } from "@/lib/patternLibrary/routeErrors";

export const runtime = "nodejs";

export async function GET() {
  try {
    const store = await resolvePatternLibraryStoreForRequest();
    const records = await store.listInteractiveCaptureSummaries();
    return NextResponse.json({ ok: true, records });
  } catch (error) {
    const auth = patternLibraryAuthResponse(error);
    if (auth) return auth;
    throw error;
  }
}
