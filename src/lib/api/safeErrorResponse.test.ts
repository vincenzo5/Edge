import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  isProductionEnvironment,
  jsonErrorResponse,
  toPublicErrorMessage,
} from "./safeErrorResponse";

describe("safeErrorResponse", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns full error message in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(toPublicErrorMessage(new Error("IBKR timeout"), "Failed")).toBe("IBKR timeout");
  });

  it("returns fallback in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(toPublicErrorMessage(new Error("IBKR timeout"), "Failed to fetch")).toBe(
      "Failed to fetch",
    );
  });

  it("jsonErrorResponse uses sanitized message", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = jsonErrorResponse(new Error("secret detail"), "Failed to fetch quotes", 500);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch quotes");
  });

  it("isProductionEnvironment reflects NODE_ENV", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isProductionEnvironment()).toBe(true);
  });
});
