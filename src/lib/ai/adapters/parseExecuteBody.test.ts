import { describe, expect, it, vi, afterEach } from "vitest";

import { parseExecuteToolBody } from "./parseExecuteBody";

describe("parseExecuteToolBody", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects bare confirmed without confirmationToken", () => {
    const parsed = parseExecuteToolBody({
      name: "delete_drawing",
      input: { drawingId: "d1" },
      permissionMode: "full",
      confirmed: true,
    });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toContain("confirmationToken");
    }
  });

  it("accepts confirmationToken and wires verifier", () => {
    vi.stubEnv("EDGE_AUTH_SECRET", "confirm-secret");
    const parsed = parseExecuteToolBody({
      name: "delete_drawing",
      input: { drawingId: "d1" },
      permissionMode: "full",
      confirmationToken: "invalid.token",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.executeOptions.verifyConfirmationToken).toBeTypeOf("function");
    }
  });
});
