import { describe, expect, it } from "vitest";

import { recordPath } from "./storage";
import { parsePatternId } from "./types";

describe("patternLibrary storage paths", () => {
  it("rejects traversal pattern ids", () => {
    expect(() => parsePatternId("../secrets")).toThrow();
    expect(() => recordPath("../secrets")).toThrow();
  });

  it("accepts slug ids used by captures", () => {
    expect(parsePatternId("capture-aapl-1700000000000")).toBe(
      "capture-aapl-1700000000000",
    );
  });
});
