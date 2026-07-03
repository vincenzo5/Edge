import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMassiveOptionsProvider } from "./options";
import {
  massiveReferenceRows,
  massiveSnapshotRow,
} from "./fixtures/optionsFixtures";

describe("createMassiveOptionsProvider", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, MASSIVE_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it("returns empty expirations when API key missing", async () => {
    delete process.env.MASSIVE_API_KEY;
    delete process.env.POLYGON_API_KEY;
    const provider = createMassiveOptionsProvider();
    const result = await provider.getOptionExpirationsWithWarnings("AAPL");
    expect(result.expirations).toEqual([]);
    expect(result.warnings[0]).toMatch(/not configured/i);
  });

  it("loads expirations from reference contracts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: "OK",
            results: massiveReferenceRows,
          }),
      })),
    );
    const provider = createMassiveOptionsProvider();
    const result = await provider.getOptionExpirationsWithWarnings("AAPL");
    expect(result.expirations).toEqual([{ underlying: "AAPL", expiration: "2025-06-20" }]);
    const url = String((fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]);
    expect(url).toContain("/v3/reference/options/contracts");
    expect(url).toContain("underlying_ticker=AAPL");
  });

  it("loads chain snapshots for one expiration", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("/v3/reference/options/contracts")) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({ status: "OK", results: massiveReferenceRows }),
          };
        }
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({ status: "OK", results: [massiveSnapshotRow] }),
        };
      }),
    );
    const provider = createMassiveOptionsProvider();
    const result = await provider.getOptionsChainWithWarnings({
      underlying: "AAPL",
      expiration: "2025-06-20",
      strikeWindow: { mode: "atm", count: 20, spot: 150 },
    });
    expect(result.chain.contracts).toHaveLength(1);
    expect(result.chain.contracts[0]?.strike).toBe(150);
    expect(result.chain.contracts[0]?.bid).toBe(1.1);
    const snapshotCall = (fetch as ReturnType<typeof vi.fn>).mock.calls.find((call) =>
      String(call[0]).includes("/v3/snapshot/options/AAPL"),
    );
    expect(snapshotCall).toBeTruthy();
  });
});
