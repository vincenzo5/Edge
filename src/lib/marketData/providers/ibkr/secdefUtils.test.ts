import { describe, it, expect } from "vitest";
import { extractOptionMonthsFromSecdef, findOptionsSecdefRow } from "./secdefUtils";

describe("secdefUtils", () => {
  it("finds OPT row even when stock conid row lacks option months (FRO case)", () => {
    const rows = [
      {
        conid: 80969279,
        symbol: "FRO",
        sections: [{ secType: "STK" }],
      },
      {
        conid: 604736961,
        symbol: "FRO",
        sections: [{ secType: "OPT", months: "JUN26;JUL26;AUG26" }],
      },
    ];

    expect(findOptionsSecdefRow(rows)?.conid).toBe(604736961);
    expect(extractOptionMonthsFromSecdef(rows)).toEqual(["JUN26", "JUL26", "AUG26"]);
  });
});
