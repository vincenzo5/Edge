import { NextResponse } from "next/server";

import { persistenceError } from "@/lib/persistence/common";
import { parseFlexCsv } from "@/lib/journal/flexImport/parseFlexCsv";
import {
  fetchFlexStatementCsv,
  readFlexWebServiceConfigFromEnv,
} from "@/lib/journal/flexImport/flexWebService";
import { importJournalFillsAndRebuild } from "@/lib/persistence/repositories/journalRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withPersistenceAuth(async (userId) => {
    const contentType = request.headers.get("content-type") ?? "";
    let csvText = "";
    let useFlexApi = false;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      useFlexApi = form.get("useFlexApi") === "true";
      const file = form.get("file");
      if (file instanceof File) {
        csvText = await file.text();
      }
    } else {
      let body: { csvText?: string; useFlexApi?: boolean } = {};
      try {
        body = (await request.json()) as { csvText?: string; useFlexApi?: boolean };
      } catch {
        return persistenceError(400, "validation", "Request body must be valid JSON or multipart form.");
      }
      csvText = body.csvText ?? "";
      useFlexApi = body.useFlexApi === true;
    }

    if (useFlexApi) {
      const config = readFlexWebServiceConfigFromEnv();
      if (!config) {
        return persistenceError(
          400,
          "validation",
          "Flex Web Service is not configured. Set IB_FLEX_TOKEN and IB_FLEX_QUERY_ID.",
        );
      }
      const fetched = await fetchFlexStatementCsv(config);
      csvText = fetched.csvText;
    }

    if (!csvText.trim()) {
      return persistenceError(400, "validation", "CSV file or csvText is required.");
    }

    const parsed = parseFlexCsv(csvText);
    if (parsed.errors.length > 0) {
      return NextResponse.json(
        {
          fills: [],
          imported: 0,
          duplicates: 0,
          skipped: parsed.skipped,
          tradesRebuilt: 0,
          errors: parsed.errors,
        },
        { status: 400 },
      );
    }

    const result = await importJournalFillsAndRebuild(userId, parsed.fills);
    return NextResponse.json({
      ...result,
      skipped: parsed.skipped,
      errors: [],
    });
  });
}
