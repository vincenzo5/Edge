import { describe, it, expect } from "vitest";
import { parseIbkrContractClassification } from "./contractClassification";

describe("parseIbkrContractClassification", () => {
  it("maps contract info fields into normalized classification", () => {
    const parsed = parseIbkrContractClassification("AAPL", 265598, {
      exchange: "NASDAQ",
      companyName: "Apple Inc.",
      industry: "Technology",
      category: "Technology",
      subcategory: "Consumer Electronics",
    });

    expect(parsed.symbol).toBe("AAPL");
    expect(parsed.exchange).toBe("NASDAQ");
    expect(parsed.industry).toBe("Technology");
    expect(parsed.subcategory).toBe("Consumer Electronics");
  });
});
