import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  fetchFlexStatementCsv,
  parseFlexReferenceCode,
} from "@/lib/journal/flexImport/flexWebService";

describe("flexWebService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("parses XML ReferenceCode from SendRequest", () => {
    expect(
      parseFlexReferenceCode(
        `<FlexStatementResponse><Status>Success</Status><ReferenceCode>12345</ReferenceCode></FlexStatementResponse>`,
      ),
    ).toBe("12345");
  });

  it("parses legacy ReferenceCode= form", () => {
    expect(parseFlexReferenceCode("ReferenceCode=999")).toBe("999");
  });

  it("throws typed error for Flex Warn/Fail XML", () => {
    expect(() =>
      parseFlexReferenceCode(
        `<FlexStatementResponse><Status>Warn</Status><ErrorCode>1025</ErrorCode><ErrorMessage>Too many failed attempts. Please review your configuration.</ErrorMessage></FlexStatementResponse>`,
      ),
    ).toThrow(/1025.*Too many failed attempts/i);
  });

  it("fetches csv using XML reference code flow", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          `<FlexStatementResponse><Status>Success</Status><ReferenceCode>12345</ReferenceCode></FlexStatementResponse>`,
        ),
      )
      .mockResolvedValueOnce(new Response("Execution ID,Symbol\n1,AAPL"));

    const pending = fetchFlexStatementCsv({ token: "token", queryId: "query" });
    await vi.runAllTimersAsync();
    const result = await pending;
    expect(result.referenceCode).toBe("12345");
    expect(result.csvText).toContain("AAPL");
    const sendUrl = String(vi.mocked(fetch).mock.calls[0]?.[0] ?? "");
    expect(sendUrl).toContain("/AccountManagement/FlexWebService/SendRequest");
  });
});
