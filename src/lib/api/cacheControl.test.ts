import { describe, expect, it } from "vitest";
import { privateCacheControl } from "./cacheControl";

describe("privateCacheControl", () => {
  it("returns private max-age aligned with server TTL seconds", () => {
    expect(privateCacheControl("fundamentals")).toBe("private, max-age=21600");
    expect(privateCacheControl("market_context")).toBe("private, max-age=21600");
    expect(privateCacheControl("search")).toBe("private, max-age=60");
    expect(privateCacheControl("quotes")).toBe("private, max-age=30");
  });
});
