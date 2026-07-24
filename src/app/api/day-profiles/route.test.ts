import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/day-profiles", () => {
  it("returns confirmed profiles by default", async () => {
    const response = await GET(new Request("http://localhost/api/day-profiles"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.profiles).toHaveLength(50);
  });

  it("filters by day type and open type", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/day-profiles?dayType=trend&openType=open_drive",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profiles.length).toBeGreaterThan(0);
    for (const profile of body.profiles) {
      expect(profile.dayType).toBe("trend");
      expect(profile.openType).toBe("open_drive");
    }
  });

  it("rejects invalid query params", async () => {
    const response = await GET(
      new Request("http://localhost/api/day-profiles?dayType=not-a-day-type"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
  });
});
