import { NextResponse } from "next/server";

import type { CopilotAttachmentSource } from "@/lib/copilot/attachmentValidation";
import {
  isPersistenceDatabaseUnavailable,
  persistenceError,
} from "@/lib/persistence/common";
import { createCopilotAttachment } from "@/lib/persistence/repositories/copilotAttachmentRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

function parseSource(raw: FormDataEntryValue | null): CopilotAttachmentSource {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value === "paste" || value === "chart_capture" || value === "upload") return value;
  return "upload";
}

export async function POST(request: Request) {
  return withPersistenceAuth(async (userId) => {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return persistenceError(400, "validation", "Expected multipart form data with a file field.");
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return persistenceError(400, "validation", "Could not parse multipart form data.");
    }

    const file = form.get("file");
    if (!file || typeof file === "string") {
      return persistenceError(400, "validation", "Missing file upload.");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";
    const source = parseSource(form.get("source"));
    const nameRaw = form.get("name");
    const name =
      typeof nameRaw === "string"
        ? nameRaw
        : file instanceof File && file.name
          ? file.name
          : null;

    try {
      const attachment = await createCopilotAttachment(userId, {
        bytes,
        mimeType,
        source,
        name,
      });
      return NextResponse.json(attachment, { status: 201 });
    } catch (error) {
      if (isPersistenceDatabaseUnavailable(error)) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Attachment upload failed.";
      return persistenceError(400, "validation", message);
    }
  });
}
