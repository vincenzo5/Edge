import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  applyBrowserTabQuote,
  clearBrowserTabQuote,
  formatBrowserTabQuote,
  formatChangePct,
  formatPrice,
  quoteFaviconDataUrl,
  quoteTone,
} from "./browserTabQuote";

describe("browserTabQuote", () => {
  describe("formatters", () => {
    it("formats full quote title", () => {
      expect(
        formatBrowserTabQuote({
          symbol: "brk-a",
          price: 712345,
          changePercent: 1.23,
        }),
      ).toBe("BRK-A 712345.00 ▲ +1.23% · Edge");
    });

    it("formats negative quote with down arrow", () => {
      expect(
        formatBrowserTabQuote({
          symbol: "AAPL",
          price: 180.5,
          changePercent: -0.42,
        }),
      ).toBe("AAPL 180.50 ▼ -0.42% · Edge");
    });

    it("formats symbol only when quote fields are missing", () => {
      expect(formatBrowserTabQuote({ symbol: "MSFT" })).toBe("MSFT · Edge");
    });

    it("derives tone and formats price/percent", () => {
      expect(quoteTone(0.1)).toBe("up");
      expect(quoteTone(-0.1)).toBe("down");
      expect(quoteTone(0)).toBe("flat");
      expect(formatPrice(12.3)).toBe("12.30");
      expect(formatChangePct(1.2)).toBe("+1.20%");
    });
  });

  describe("favicon tint", () => {
    it("tints Edge candles green when up and red when down", () => {
      const up = decodeURIComponent(quoteFaviconDataUrl("up").replace("data:image/svg+xml,", ""));
      const down = decodeURIComponent(quoteFaviconDataUrl("down").replace("data:image/svg+xml,", ""));
      expect(up).toContain("#089981");
      expect(up).not.toContain("#00FF88");
      expect(down).toContain("#f23645");
      expect(down).not.toContain("#00FF88");
    });

    it("overlays a centered direction arrow for up and down", () => {
      const up = decodeURIComponent(quoteFaviconDataUrl("up").replace("data:image/svg+xml,", ""));
      const down = decodeURIComponent(quoteFaviconDataUrl("down").replace("data:image/svg+xml,", ""));
      const flat = decodeURIComponent(quoteFaviconDataUrl("flat").replace("data:image/svg+xml,", ""));
      expect(up).toContain('d="M16 12.5 L19.5 18.5 H12.5 Z"');
      expect(down).toContain('d="M16 19.5 L19.5 13.5 H12.5 Z"');
      expect(flat).not.toContain('d="M16 12.5');
      expect(flat).not.toContain('d="M16 19.5');
    });
  });

  describe("dom apply/clear", () => {
    beforeEach(() => {
      document.title = "Edge";
      document.head.innerHTML =
        '<link rel="icon" href="/brand/favicon.svg" type="image/svg+xml" />';
    });

    afterEach(() => {
      clearBrowserTabQuote();
    });

    it("sets document title and tinted Edge favicon", () => {
      applyBrowserTabQuote({ symbol: "F", price: 12.34, changePercent: 2.5 });
      expect(document.title).toBe("F 12.34 ▲ +2.50% · Edge");
      const dynamic = document.getElementById("edge-quote-favicon") as HTMLLinkElement;
      expect(dynamic).toBeInstanceOf(HTMLLinkElement);
      expect(dynamic.href).toContain(encodeURIComponent("#089981"));
    });

    it("uses red Edge favicon when quote is down", () => {
      applyBrowserTabQuote({ symbol: "F", price: 12.34, changePercent: -1 });
      const dynamic = document.getElementById("edge-quote-favicon") as HTMLLinkElement;
      expect(dynamic.href).toContain(encodeURIComponent("#f23645"));
    });

    it("clears quote title and restores static Edge favicon", () => {
      applyBrowserTabQuote({ symbol: "F", price: 12.34, changePercent: -1 });
      clearBrowserTabQuote();
      expect(document.title).toBe("Edge");
      expect(document.getElementById("edge-quote-favicon")).toBeNull();
    });
  });
});
