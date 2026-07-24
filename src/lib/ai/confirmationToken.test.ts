import { describe, expect, it, vi, afterEach } from "vitest";

import {
  hashToolInput,
  mintConfirmationToken,
  verifyConfirmationToken,
} from "./confirmationToken";

describe("confirmationToken", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("mints and verifies a token bound to tool, input, and permission mode", () => {
    vi.stubEnv("EDGE_AUTH_SECRET", "confirm-secret");
    const now = 1_700_000_000_000;
    const token = mintConfirmationToken({
      toolName: "delete_drawing",
      input: { drawingId: "d1" },
      permissionMode: "full",
      now,
    });
    expect(token).toBeTruthy();
    expect(
      verifyConfirmationToken(
        token!,
        "delete_drawing",
        { drawingId: "d1" },
        "full",
        now + 1,
      ),
    ).toBe(true);
  });

  it("rejects forged confirmed execution without a valid token", () => {
    vi.stubEnv("EDGE_AUTH_SECRET", "confirm-secret");
    const token = mintConfirmationToken({
      toolName: "delete_drawing",
      input: { drawingId: "d1" },
      permissionMode: "full",
    });
    expect(token).toBeTruthy();
    expect(
      verifyConfirmationToken(token!, "delete_drawing", { drawingId: "d2" }, "full"),
    ).toBe(false);
    expect(
      verifyConfirmationToken(token!, "place_order", { drawingId: "d1" }, "full"),
    ).toBe(false);
  });

  it("rejects expired tokens", () => {
    vi.stubEnv("EDGE_AUTH_SECRET", "confirm-secret");
    const now = 1_700_000_000_000;
    const token = mintConfirmationToken({
      toolName: "delete_drawing",
      input: { drawingId: "d1" },
      permissionMode: "full",
      now,
    });
    expect(
      verifyConfirmationToken(
        token!,
        "delete_drawing",
        { drawingId: "d1" },
        "full",
        now + 6 * 60 * 1000,
      ),
    ).toBe(false);
  });

  it("hashes tool input deterministically", () => {
    expect(hashToolInput({ b: 1, a: 2 })).toBe(hashToolInput({ a: 2, b: 1 }));
  });
});
