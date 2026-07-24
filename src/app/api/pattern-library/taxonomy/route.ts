import { NextResponse } from "next/server";

import { resolvePatternLibraryStoreForRequest } from "@/lib/patternLibrary/patternLibraryStore";
import { patternLibraryAuthResponse } from "@/lib/patternLibrary/routeErrors";

export const runtime = "nodejs";

export async function GET() {
  try {
    const store = await resolvePatternLibraryStoreForRequest();
    const taxonomy = await store.loadTaxonomy();
    return NextResponse.json({
      ok: true,
      setupFamilies: taxonomy.setupFamilies.map((family) => ({
        id: family.id,
        name: family.name,
      })),
    });
  } catch (error) {
    const auth = patternLibraryAuthResponse(error);
    if (auth) return auth;
    throw error;
  }
}
