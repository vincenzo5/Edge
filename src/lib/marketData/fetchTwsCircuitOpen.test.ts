import { describe, expect, it, vi } from "vitest";
import { fetchTwsCircuitOpen } from "./fetchTwsCircuitOpen";

describe("fetchTwsCircuitOpen", () => {
  it("returns true when TWS provider circuit is open", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          health: {
            generatedAt: Date.now(),
            providers: [{ id: "tws", circuitOpen: true }],
          },
        }),
      ),
    );

    await expect(fetchTwsCircuitOpen()).resolves.toBe(true);
  });

  it("returns false when health fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.error()));

    await expect(fetchTwsCircuitOpen()).resolves.toBe(false);
  });
});
