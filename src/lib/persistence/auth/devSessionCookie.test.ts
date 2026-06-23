import { afterEach, describe, expect, it } from "vitest";

import {
  createSignedUserCookieValue,
  verifySignedUserCookieValue,
} from "./devSessionCookie";

const TEST_SECRET = "test-auth-secret";

describe("devSessionCookie", () => {
  afterEach(() => {
    delete process.env.EDGE_AUTH_SECRET;
  });

  it("creates and verifies a signed user cookie value", () => {
    process.env.EDGE_AUTH_SECRET = TEST_SECRET;

    const signed = createSignedUserCookieValue("11111111-1111-1111-1111-111111111111");
    expect(signed).toContain(".");
    expect(
      verifySignedUserCookieValue(
        signed,
        TEST_SECRET,
      ),
    ).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("rejects tampered cookie values", () => {
    process.env.EDGE_AUTH_SECRET = TEST_SECRET;

    const signed = createSignedUserCookieValue("11111111-1111-1111-1111-111111111111");
    const tampered = `${signed.slice(0, -1)}x`;

    expect(verifySignedUserCookieValue(tampered, TEST_SECRET)).toBeNull();
  });

  it("rejects unsigned legacy cookie values", () => {
    process.env.EDGE_AUTH_SECRET = TEST_SECRET;

    expect(
      verifySignedUserCookieValue("11111111-1111-1111-1111-111111111111", TEST_SECRET),
    ).toBeNull();
  });
});
