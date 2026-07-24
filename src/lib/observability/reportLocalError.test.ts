import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  LOCAL_ERRORS_API_PATH,
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
    resetReportLocalErrorForTests();
  });

  it("POSTs redacted client errors to the local ingest route", async () => {
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

  it("dedupes identical messages within five seconds", async () => {
    reportLocalError({ source: "window", message: "boom" });
    reportLocalError({ source: "window", message: "boom" });

    await Promise.resolve();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("skips errors about the local ingest route itself", async () => {
    reportLocalError({
      source: "window",
      message: `Failed to fetch ${LOCAL_ERRORS_API_PATH}`,
    });

    await Promise.resolve();

    expect(fetch).not.toHaveBeenCalled();
  });
});
