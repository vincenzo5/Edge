import { describe, expect, it } from "vitest";
import {
  renderCandlestickSvg,
  FROZEN_CHART_STYLE,
  sectionsToRenderOverlays,
} from "./renderChart";
import type { OhlcvBar } from "./types";

describe("patternLibrary renderChart", () => {
  it("renders deterministic SVG for candle series", () => {
    const bars: OhlcvBar[] = [
      { timestamp: 1, open: 10, high: 11, low: 9, close: 10.5 },
      { timestamp: 2, open: 11, high: 11.5, low: 9.5, close: 10 },
    ];
    const svg = renderCandlestickSvg(bars, FROZEN_CHART_STYLE);
    expect(svg).toContain("<svg");
    expect(svg).toContain(FROZEN_CHART_STYLE.upColor);
    expect(svg).toContain(FROZEN_CHART_STYLE.downColor);
  });

  it("renders section labels when provided", () => {
    const bars: OhlcvBar[] = Array.from({ length: 6 }, (_, i) => ({
      timestamp: i,
      open: 10,
      high: 11,
      low: 9,
      close: 10,
    }));
    const svg = renderCandlestickSvg(bars, FROZEN_CHART_STYLE, {
      sections: sectionsToRenderOverlays(
        [
          {
            id: "s1",
            label: "setup",
            fromBar: 1,
            toBar: 3,
            fromTimestamp: 1,
            toTimestamp: 3,
          },
        ],
        1,
        0,
      ),
    });
    expect(svg).toContain("setup");
  });
});
