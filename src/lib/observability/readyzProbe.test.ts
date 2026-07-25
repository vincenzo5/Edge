import { describe, expect, it, vi } from "vitest";

import { probeReadyz, resolveReadyzUrl } from "./readyzProbe";

describe("resolveReadyzUrl", () => {
  it("defaults to local readyz", () => {
    expect(resolveReadyzUrl({})).toBe("http://127.0.0.1:3003/readyz");
  });

  it("uses EDGE_READYZ_URL when set", () => {
    expect(
      resolveReadyzUrl({ EDGE_READYZ_URL: "https://edge.example/readyz" }),
    ).toBe("https://edge.example/readyz");
  });
});

describe("probeReadyz", () => {
  it("returns ok for 200 response", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ ok: true }, { status: 200 }),
    );

    const result = await probeReadyz("http://127.0.0.1:3003/readyz", fetchImpl);

    expect(result).toEqual({
      ok: true,
      reasons: [],
      httpStatus: 200,
    });
  });

  it("returns reason codes for 503 response", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json(
        { ok: false, reasons: ["postgres_unavailable", "redis_unavailable"] },
        { status: 503 },
      ),
    );

    const result = await probeReadyz("http://127.0.0.1:3003/readyz", fetchImpl);

    expect(result).toEqual({
      ok: false,
      reasons: ["postgres_unavailable", "redis_unavailable"],
      httpStatus: 503,
    });
  });

  it("filters unknown reason codes", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json(
        {
          ok: false,
          reasons: ["postgres_unavailable", "secret_dump", "redis_unavailable"],
        },
        { status: 503 },
      ),
    );

    const result = await probeReadyz("http://127.0.0.1:3003/readyz", fetchImpl);

    expect(result.reasons).toEqual(["postgres_unavailable", "redis_unavailable"]);
  });

  it("returns readyz_invalid_response for malformed JSON body", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("{not-json", {
        status: 503,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await probeReadyz("http://127.0.0.1:3003/readyz", fetchImpl);

    expect(result).toEqual({
      ok: false,
      reasons: ["readyz_invalid_response"],
      httpStatus: 503,
    });
  });

  it("returns readyz_unreachable on network failure", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });

    const result = await probeReadyz("http://127.0.0.1:3003/readyz", fetchImpl);

    expect(result).toEqual({
      ok: false,
      reasons: ["readyz_unreachable"],
    });
  });
});
