import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { massiveGetPaginated } from "./client";

describe("massiveGetPaginated", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, MASSIVE_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it("adds apiKey when following next_url without one", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (!url.includes("cursor=page2")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              status: "OK",
              results: [{ id: 1 }],
              next_url:
                "https://api.massive.com/v3/reference/options/contracts?cursor=page2&underlying_ticker=AAPL",
            }),
        };
      }
      expect(url).toContain("apiKey=test-key");
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: "OK",
            results: [{ id: 2 }],
          }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await massiveGetPaginated<{ results?: { id: number }[]; next_url?: string }>(
      "/v3/reference/options/contracts",
      { underlying_ticker: "AAPL" },
    );

    expect(result.data.results).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
