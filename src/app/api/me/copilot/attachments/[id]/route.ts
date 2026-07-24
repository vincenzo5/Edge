import { NextResponse } from "next/server";

import { persistenceError } from "@/lib/persistence/common";
import { readCopilotAttachmentBytes } from "@/lib/persistence/repositories/copilotAttachmentRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id: attachmentId } = await context.params;
  return withPersistenceAuth(async (userId) => {
    const payload = await readCopilotAttachmentBytes(userId, attachmentId);
    if (!payload) {
      return persistenceError(404, "not_found", "Attachment not found.");
    }
    return new NextResponse(new Uint8Array(payload.bytes), {
      status: 200,
      headers: {
        "Content-Type": payload.mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  });
}
