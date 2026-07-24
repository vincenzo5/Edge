import { describe, expect, it } from "vitest";
import { formatToolResultForModel } from "./summarizeToolResult";

describe("formatToolResultForModel", () => {
  it("includes top-level meta when present on data payload", () => {
    const formatted = formatToolResultForModel({
      ok: true,
      data: {
        symbol: "AAPL",
        meta: {
          source: "yahoo",
          stale: false,
        },
      },
    });

    expect(JSON.parse(formatted)).toEqual({
      data: {
        symbol: "AAPL",
        meta: {
          source: "yahoo",
          stale: false,
        },
      },
      meta: {
        source: "yahoo",
        stale: false,
      },
    });
  });

  it("serializes data only when meta is absent", () => {
    const formatted = formatToolResultForModel({
      ok: true,
      data: { count: 3 },
    });

    expect(JSON.parse(formatted)).toEqual({ count: 3 });
  });
});
