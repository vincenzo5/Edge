import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("/healthz GET", () => {
  it("returns 200 with ok true and no dependency checks", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json).toEqual({ ok: true });
    const body = JSON.stringify(json);
    expect(body).not.toMatch(/postgres:\/\//);
    expect(body).not.toMatch(/redis:\/\//);
    expect(body).not.toMatch(/DATABASE_URL/);
    expect(body).not.toMatch(/REDIS_URL/);
  });
});
