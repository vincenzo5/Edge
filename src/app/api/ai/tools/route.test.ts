import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/ai/tools", () => {
  it("returns tool definitions", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const json = (await response.json()) as { tools: Array<{ name: string }> };
    expect(Array.isArray(json.tools)).toBe(true);
    expect(json.tools.some((t) => t.name === "search_symbols")).toBe(true);
  });
});
