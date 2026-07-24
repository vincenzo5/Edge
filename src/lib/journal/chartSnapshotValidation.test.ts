import { describe, expect, it } from "vitest";

import {
  JOURNAL_CHART_SNAPSHOT_MAX_PER_TRADE,
  validateJournalChartSnapshotPayload,
} from "@/lib/journal/chartSnapshotValidation";

describe("chartSnapshotValidation", () => {
  it("rejects when trade snapshot limit reached", () => {
    const result = validateJournalChartSnapshotPayload(1024, JOURNAL_CHART_SNAPSHOT_MAX_PER_TRADE);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(String(JOURNAL_CHART_SNAPSHOT_MAX_PER_TRADE));
    }
  });

  it("accepts payload under size limit", () => {
    expect(validateJournalChartSnapshotPayload(1024, 0)).toEqual({ ok: true });
  });
});
