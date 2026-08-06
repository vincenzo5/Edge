import { describe, expect, it } from "vitest";

import { mapExecutionToJournalFill } from "@/lib/journal/mapExecutionToFill";
import type { AccountExecution } from "@/lib/marketData/contracts/brokerage";

function execution(partial: Partial<AccountExecution> & Pick<AccountExecution, "execId">): AccountExecution {
  return {
    symbol: "AAPL",
    secType: "STK",
    side: "SLD",
    shares: 200,
    price: 296.06,
    time: "20260624;093542",
    ...partial,
  };
}

describe("mapExecutionToJournalFill", () => {
  it("parses Flex-format execution time as America/New_York (not Z)", () => {
    const fill = mapExecutionToJournalFill(execution({ execId: "e1" }), "flex_csv");
    expect(fill?.fillTime).toBe("2026-06-24T13:35:42.000Z");
  });

  it("keeps ISO execution times with explicit offsets", () => {
    const fill = mapExecutionToJournalFill(
      execution({
        execId: "e2",
        time: "2026-08-05T18:35:35.000Z",
      }),
      "live",
    );
    expect(fill?.fillTime).toBe("2026-08-05T18:35:35.000Z");
  });
});
