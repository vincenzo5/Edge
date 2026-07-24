import { NextResponse } from "next/server";

import {
  isPersistenceDatabaseUnavailable,
  persistenceError,
} from "@/lib/persistence/common";
import type { JournalScreenshotSource } from "@/lib/journal/screenshotValidation";
import {
  createJournalTradeScreenshot,
  listJournalTradeScreenshots,
} from "@/lib/persistence/repositories/journalScreenshotRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseSource(raw: FormDataEntryValue | null): JournalScreenshotSource {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value === "paste" || value === "chart_capture" || value === "upload") return value;
  return "upload";
}

export async function GET(_request: Request, context: RouteContext) {
  const { id: tradeId } = await context.params;
  return withPersistenceAuth(async (userId) => {
    const screenshots = await listJournalTradeScreenshots(userId, tradeId);
    return NextResponse.json({ screenshots });
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { id: tradeId } = await context.params;
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
    const captionRaw = form.get("caption");
    const caption = typeof captionRaw === "string" ? captionRaw : null;

    try {
      const screenshot = await createJournalTradeScreenshot(userId, tradeId, {
        bytes,
        mimeType,
        source,
        caption,
      });
      if (!screenshot) {
        return persistenceError(404, "not_found", "Journal trade not found.");
      }
      return NextResponse.json(screenshot, { status: 201 });
    } catch (error) {
      if (isPersistenceDatabaseUnavailable(error)) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Screenshot upload failed.";
      return persistenceError(400, "validation", message);
    }
  });
}
