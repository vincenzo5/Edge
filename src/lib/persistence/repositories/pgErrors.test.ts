import { describe, expect, it } from "vitest";

import { isUniqueViolation } from "./pgErrors";

describe("isUniqueViolation", () => {
  it("detects postgres unique constraint errors", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});

describe("isIntegerOutOfRange", () => {
  it("detects postgres numeric overflow", async () => {
    const { isIntegerOutOfRange } = await import("./pgErrors");
    expect(isIntegerOutOfRange({ code: "22003" })).toBe(true);
    expect(isIntegerOutOfRange(new Error("integer out of range"))).toBe(true);
    expect(isIntegerOutOfRange(new Error("boom"))).toBe(false);
  });
});
