import type { OhlcvBar, PatternSection } from "./types";

export type ChartRenderStyle = {
  id: string;
  width: number;
  height: number;
  upColor: string;
  downColor: string;
  background: string;
  gridColor: string;
};

export const FROZEN_CHART_STYLE: ChartRenderStyle = {
  id: "edge-frozen-v1",
  width: 1200,
  height: 700,
  upColor: "#006340",
  downColor: "#A02128",
  background: "#0d1117",
  gridColor: "#21262d",
};

export const SECTION_BAND_COLORS = [
  "rgba(0, 99, 64, 0.12)",
  "rgba(59, 130, 246, 0.12)",
  "rgba(234, 179, 8, 0.12)",
  "rgba(168, 85, 247, 0.12)",
  "rgba(236, 72, 153, 0.12)",
  "rgba(14, 165, 233, 0.12)",
];

export type RenderSectionOverlay = {
  /** Inclusive bar index within the rendered bars array. */
  fromRenderIndex: number;
  toRenderIndex: number;
  label: string;
};

export type RenderCandlestickOptions = {
  sections?: RenderSectionOverlay[];
};

function buildPlotGeometry(bars: OhlcvBar[], style: ChartRenderStyle) {
  const pad = { top: 24, right: 48, bottom: 48, left: 48 };
  const plotW = style.width - pad.left - pad.right;
  const plotH = style.height - pad.top - pad.bottom;
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);
  const minP = Math.min(...lows);
  const maxP = Math.max(...highs);
  const span = maxP - minP || 1;
  const barW = plotW / Math.max(1, bars.length);
  const bodyW = Math.max(1, barW * 0.6);
  const y = (price: number) => pad.top + plotH - ((price - minP) / span) * plotH;
  const xCenter = (i: number) => pad.left + i * barW + barW / 2;
  const xLeft = (i: number) => pad.left + i * barW;
  const xRight = (i: number) => pad.left + (i + 1) * barW;
  return { pad, plotW, plotH, barW, bodyW, y, xCenter, xLeft, xRight, minP, maxP };
}

export function renderCandlestickSvg(
  bars: OhlcvBar[],
  style: ChartRenderStyle = FROZEN_CHART_STYLE,
  options: RenderCandlestickOptions = {},
): string {
  if (bars.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${style.width}" height="${style.height}"></svg>`;
  }

  const { pad, plotW, plotH, bodyW, y, xCenter, xLeft, xRight } = buildPlotGeometry(
    bars,
    style,
  );

  const gridLines = 4;
  let grid = "";
  for (let g = 0; g <= gridLines; g++) {
    const gy = pad.top + (plotH * g) / gridLines;
    grid += `<line x1="${pad.left}" y1="${gy}" x2="${pad.left + plotW}" y2="${gy}" stroke="${style.gridColor}" stroke-width="1"/>`;
  }

  let sectionBands = "";
  let sectionLabels = "";
  if (options.sections?.length) {
    options.sections.forEach((section, index) => {
      const from = Math.max(0, section.fromRenderIndex);
      const to = Math.min(bars.length - 1, section.toRenderIndex);
      if (from > to) return;
      const x1 = xLeft(from);
      const x2 = xRight(to);
      const color = SECTION_BAND_COLORS[index % SECTION_BAND_COLORS.length]!;
      sectionBands += `<rect x="${x1}" y="${pad.top}" width="${Math.max(1, x2 - x1)}" height="${plotH}" fill="${color}"/>`;
      const midX = (x1 + x2) / 2;
      const labelY = pad.top + 14;
      const escaped = section.label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      sectionLabels += `<rect x="${midX - 48}" y="${labelY - 10}" width="96" height="18" rx="4" fill="rgba(13,17,23,0.85)" stroke="#30363d"/>`;
      sectionLabels += `<text x="${midX}" y="${labelY + 2}" text-anchor="middle" fill="#e6edf3" font-family="system-ui,sans-serif" font-size="11">${escaped}</text>`;
    });
  }

  let candles = "";
  bars.forEach((bar, i) => {
    const up = bar.close >= bar.open;
    const color = up ? style.upColor : style.downColor;
    const cx = xCenter(i);
    const yHigh = y(bar.high);
    const yLow = y(bar.low);
    const yOpen = y(bar.open);
    const yClose = y(bar.close);
    const top = Math.min(yOpen, yClose);
    const bottom = Math.max(yOpen, yClose);
    const bodyH = Math.max(1, bottom - top);

    candles += `<line x1="${cx}" y1="${yHigh}" x2="${cx}" y2="${yLow}" stroke="${color}" stroke-width="1"/>`;
    candles += `<rect x="${cx - bodyW / 2}" y="${top}" width="${bodyW}" height="${bodyH}" fill="${color}"/>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${style.width}" height="${style.height}">
  <rect width="100%" height="100%" fill="${style.background}"/>
  ${grid}
  ${sectionBands}
  ${candles}
  ${sectionLabels}
</svg>`;
}

export function renderStyleVariant(
  bars: OhlcvBar[],
  variant: "light" | "dark",
  options: RenderCandlestickOptions = {},
): string {
  const base = { ...FROZEN_CHART_STYLE, id: `edge-frozen-v1-${variant}` };
  if (variant === "light") {
    return renderCandlestickSvg(
      bars,
      {
        ...base,
        background: "#ffffff",
        gridColor: "#e5e7eb",
      },
      options,
    );
  }
  return renderCandlestickSvg(bars, base, options);
}

export function sectionsToRenderOverlays(
  sections: PatternSection[],
  patternStartBar: number,
  leftPaddingBars: number,
): RenderSectionOverlay[] {
  return sections.map((section) => ({
    fromRenderIndex: section.fromBar - patternStartBar + leftPaddingBars,
    toRenderIndex: section.toBar - patternStartBar + leftPaddingBars,
    label: section.label,
  }));
}
