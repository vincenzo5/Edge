import { NextResponse } from "next/server";

import { persistenceError } from "@/lib/persistence/common";
import { getUserScriptRevision } from "@/lib/persistence/repositories/scriptsRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ scriptId: string; revision: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { scriptId, revision } = await context.params;
  return withPersistenceAuth(async (userId) => {
    const record = await getUserScriptRevision(userId, scriptId, revision);
    if (!record) {
      return persistenceError(
        404,
        "not_found",
        `Revision not found: ${scriptId}@${revision}`,
      );
    }
    return NextResponse.json({ revision: record });
  });
}
