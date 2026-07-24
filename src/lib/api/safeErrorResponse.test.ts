import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  isProductionEnvironment,
  jsonErrorResponse,
  toPublicErrorMessage,
} from "./safeErrorResponse";

const appendLocalError = vi.fn();

vi.mock("@/lib/observability/localErrorLog", () => ({
  appendLocalError: (...args: unknown[]) => appendLocalError(...args),
}));

describe("safeErrorResponse", () => {
  beforeEach(() => {
    appendLocalError.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns full error message in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(toPublicErrorMessage(new Error("IBKR timeout"), "Failed")).toBe("IBKR timeout");
    expect(appendLocalError).toHaveBeenCalledWith({
      source: "api",
      message: "IBKR timeout",
      stack: expect.any(String),
    });
  });

  it("returns fallback in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(
      toPublicErrorMessage(
        new Error("IBKR timeout api_key=secret accountId=DU123456"),
        "Failed to fetch",
      ),
    ).toBe("Failed to fetch");
    expect(console.error).toHaveBeenCalledWith("[api]", "Failed to fetch");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(
      /secret|DU123456/,
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
