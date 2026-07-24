import { describe, expect, it } from "vitest";

import { computeServerRevisionFromSource } from "@/lib/persistence/repositories/scriptsRepository";
import { normalizeScriptSource } from "@/lib/scriptLibrary/hash";
import { DEFAULT_SCRIPT_TEMPLATE } from "@/lib/scriptLibrary/types";

describe("scriptsRepository", () => {
  it("computes stable revision hashes on the server", () => {
    const normalized = normalizeScriptSource(DEFAULT_SCRIPT_TEMPLATE);
    const a = computeServerRevisionFromSource(normalized);
    const b = computeServerRevisionFromSource(normalized);
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
  });
});
