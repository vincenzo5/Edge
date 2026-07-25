import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  LOCAL_ERRORS_API_PATH,
  PRODUCTION_ERRORS_API_PATH,
  reportLocalError,
  resetReportLocalErrorForTests,
} from "./reportLocalError";

describe("reportLocalError", () => {
  beforeEach(() => {
    resetReportLocalErrorForTests();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    resetReportLocalErrorForTests();
  });

  it("POSTs redacted client errors to the local ingest route in non-prod", async () => {
    vi.stubEnv("NODE_ENV", "development");
    reportLocalError({
      source: "chart",
      message: "Chart render failed",
      stack: "Error: boom",
    });

    await Promise.resolve();

    expect(fetch).toHaveBeenCalledWith(
      LOCAL_ERRORS_API_PATH,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          source: "chart",
          message: "Chart render failed",
          stack: "Error: boom",
        }),
      }),
    );
  });

  it("POSTs to auth-gated production ingest in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    reportLocalError({
      source: "window",
      message: "Unhandled rejection",
    });

    await Promise.resolve();

    expect(fetch).toHaveBeenCalledWith(
      PRODUCTION_ERRORS_API_PATH,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
  });

  it("dedupes identical messages within five seconds", async () => {
    reportLocalError({ source: "window", message: "boom" });
    reportLocalError({ source: "window", message: "boom" });

    await Promise.resolve();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("skips errors about ingest routes themselves", async () => {
    reportLocalError({
      source: "window",
      message: `Failed to fetch ${LOCAL_ERRORS_API_PATH}`,
    });
    reportLocalError({
      source: "window",
      message: `Failed to fetch ${PRODUCTION_ERRORS_API_PATH}`,
    });

    await Promise.resolve();

    expect(fetch).not.toHaveBeenCalled();
  });
});
