import { describe, expect, it, vi, beforeEach } from "vitest";

import { fetchFlexStatementCsv } from "@/lib/journal/flexImport/flexWebService";

describe("flexWebService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches csv using reference code flow", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("ReferenceCode=12345"))
      .mockResolvedValueOnce(new Response("Execution ID,Symbol\n1,AAPL"));

    const result = await fetchFlexStatementCsv({ token: "token", queryId: "query" });
    expect(result.referenceCode).toBe("12345");
    expect(result.csvText).toContain("AAPL");
  });
});
