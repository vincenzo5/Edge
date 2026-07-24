import { describe, expect, it, vi, afterEach } from "vitest";
import {
  getRequestIdHeaderName,
  isValidRequestId,
  mintRequestId,
  resolveRequestId,
} from "./requestIdCore";
import { getRequestId, runWithRequestId } from "./requestIdContext";

describe("requestIdCore", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults header name to x-edge-request-id", () => {
    delete process.env.EDGE_REQUEST_ID_HEADER;
    expect(getRequestIdHeaderName()).toBe("x-edge-request-id");
  });

  it("reads custom header name from env", () => {
    vi.stubEnv("EDGE_REQUEST_ID_HEADER", "x-request-id");
    expect(getRequestIdHeaderName()).toBe("x-request-id");
  });

  it("accepts valid incoming IDs and rejects invalid values", () => {
    vi.stubEnv("EDGE_REQUEST_ID_HEADER", "x-edge-request-id");
    const headers = new Headers({ "x-edge-request-id": "abc-123_test" });
    expect(resolveRequestId(headers)).toBe("abc-123_test");
    expect(isValidRequestId("")).toBe(false);
    expect(isValidRequestId("bad id")).toBe(false);
    expect(isValidRequestId("a".repeat(129))).toBe(false);
  });

  it("mints when incoming header is missing or invalid", () => {
    vi.stubEnv("EDGE_REQUEST_ID_HEADER", "x-edge-request-id");
    const minted = resolveRequestId(new Headers());
    expect(isValidRequestId(minted)).toBe(true);
    expect(mintRequestId()).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i,
    );
  });
});

describe("requestIdContext", () => {
  it("stores requestId in ALS for nested calls", () => {
    expect(getRequestId()).toBeUndefined();
    runWithRequestId("req-123", () => {
      expect(getRequestId()).toBe("req-123");
    });
    expect(getRequestId()).toBeUndefined();
  });
});
