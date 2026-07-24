import { NextResponse } from "next/server";

import { listPatternRecords } from "@/lib/persistence/repositories/patternLibraryRepository";
import {
  compareRecordSummariesNewestFirst,
  isInteractiveCapture,
  toRecordSummary,
} from "@/lib/patternLibrary/recordSummaries";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET() {
  return withPersistenceAuth(async (userId) => {
    const records = await listPatternRecords(userId);
    const summaries = records
      .filter(isInteractiveCapture)
      .map((record) => toRecordSummary(record, record.ohlcv.length >= 2))
      .sort(compareRecordSummariesNewestFirst);
    return NextResponse.json({ ok: true, records: summaries });
  });
}
