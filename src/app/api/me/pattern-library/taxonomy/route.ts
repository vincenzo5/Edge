import { NextResponse } from "next/server";

import { ensurePatternTaxonomy } from "@/lib/persistence/repositories/patternLibraryRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET() {
  return withPersistenceAuth(async (userId) => {
    const record = await ensurePatternTaxonomy(userId);
    return NextResponse.json({
      schemaVersion: record.schemaVersion,
      syncRevision: record.syncRevision,
      updatedAt: record.updatedAt,
      taxonomy: record.taxonomy,
    });
  });
}
