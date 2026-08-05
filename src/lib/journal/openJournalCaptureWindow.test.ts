/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from "vitest";

import {
  buildJournalCaptureUrl,
  openJournalCaptureWindow,
} from "./openJournalCaptureWindow";

describe("openJournalCaptureWindow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds capture URL with token and trade id", () => {
    expect(
      buildJournalCaptureUrl({ token: "token-1", tradeId: "trade-1" }),
    ).toBe("/journal/capture?token=token-1&tradeId=trade-1");
  });

  it("returns popup_blocked when window.open returns null", () => {
    vi.spyOn(window, "open").mockReturnValue(null);

    expect(
      openJournalCaptureWindow({ token: "token-1", tradeId: "trade-1" }),
    ).toEqual({ ok: false, reason: "popup_blocked" });
  });

  it("opens capture window with expected URL", () => {
    const mockWindow = {} as Window;
    const openSpy = vi.spyOn(window, "open").mockReturnValue(mockWindow);

    const result = openJournalCaptureWindow({ token: "token-1", tradeId: "trade-1" });

    expect(result).toEqual({ ok: true, window: mockWindow });
    expect(openSpy).toHaveBeenCalledWith(
      "/journal/capture?token=token-1&tradeId=trade-1",
      "edge-journal-capture-token-1",
      expect.stringContaining("popup=yes"),
    );
  });
});
