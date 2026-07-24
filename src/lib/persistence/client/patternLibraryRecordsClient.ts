import type { PatternRecordSummary } from "@/lib/patternLibrary/recordSummaries";
import { getOrFetchClientTtl } from "@/lib/marketData/cache/getOrFetchClientTtl";
import {
  invalidatePatternLibraryRecordsCache,
  PATTERN_LIBRARY_RECORDS_CACHE_KEY,
} from "./persistenceClientCache";

export { invalidatePatternLibraryRecordsCache };

export async function fetchPatternLibraryRecordSummaries(): Promise<PatternRecordSummary[]> {
  return getOrFetchClientTtl(
    "pattern_library_records",
    PATTERN_LIBRARY_RECORDS_CACHE_KEY,
    async () => {
      const response = await fetch("/api/pattern-library/records");
      if (!response.ok) {
        throw new Error("Failed to load pattern library");
      }
      const payload = (await response.json()) as { records: PatternRecordSummary[] };
      return payload.records;
    },
  );
}
