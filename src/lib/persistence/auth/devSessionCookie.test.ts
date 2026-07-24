import { afterEach, describe, expect, it } from "vitest";

import {
  createSignedUserCookieValue,
  SESSION_MAX_AGE_SEC,
  verifySignedUserCookieValue,
} from "./devSessionCookie";

const TEST_SECRET = "test-auth-secret";
const USER_ID = "11111111-1111-1111-1111-111111111111";

describe("devSessionCookie", () => {
  afterEach(() => {
    delete process.env.EDGE_AUTH_SECRET;
  });

  it("creates and verifies a signed user cookie value with iat and jti", () => {
    process.env.EDGE_AUTH_SECRET = TEST_SECRET;

    const signed = createSignedUserCookieValue(USER_ID);
    expect(signed).toContain(".");
    expect(signed.split(".")).toHaveLength(2);
    expect(verifySignedUserCookieValue(signed, TEST_SECRET)).toBe(USER_ID);
  });

  it("rejects tampered cookie values", () => {
    process.env.EDGE_AUTH_SECRET = TEST_SECRET;

    const signed = createSignedUserCookieValue(USER_ID);
    const tampered = `${signed.slice(0, -1)}x`;

    expect(verifySignedUserCookieValue(tampered, TEST_SECRET)).toBeNull();
  });

  it("rejects legacy userId.sig cookie values", () => {
    process.env.EDGE_AUTH_SECRET = TEST_SECRET;

    expect(verifySignedUserCookieValue(USER_ID, TEST_SECRET)).toBeNull();
  });

  it("rejects expired cookies based on iat", () => {
    process.env.EDGE_AUTH_SECRET = TEST_SECRET;

    const expiredAt = Date.now() - (SESSION_MAX_AGE_SEC + 60) * 1000;
    const signed = createSignedUserCookieValue(USER_ID, {
      secret: TEST_SECRET,
      now: expiredAt,
      jti: "00000000-0000-0000-0000-000000000001",
    });

    expect(verifySignedUserCookieValue(signed, TEST_SECRET)).toBeNull();
  });

  it("rejects cookies with future iat beyond clock skew", () => {
    process.env.EDGE_AUTH_SECRET = TEST_SECRET;

    const futureAt = Date.now() + 5 * 60 * 1000;
    const signed = createSignedUserCookieValue(USER_ID, {
      secret: TEST_SECRET,
      now: futureAt,
      jti: "00000000-0000-0000-0000-000000000002",
    });

    expect(verifySignedUserCookieValue(signed, TEST_SECRET)).toBeNull();
  });
});
