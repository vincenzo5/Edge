import { registerStyles, CandleType, type DeepPartial, type Styles } from "klinecharts";
import type { Theme } from "./chartConfig";

// Standard light/dark palettes (no Edge brand colors). Values chosen to look
// close to TradingView defaults.
const LIGHT: DeepPartial<Styles> = {
  grid: {
    horizontal: { color: "#E0E3EB" },
    vertical: { color: "#E0E3EB" },
  },
  candle: {
    type: CandleType.CandleSolid,
    bar: {
      upColor: "#26A69A",
      downColor: "#EF5350",
      noChangeColor: "#888888",
      upBorderColor: "#26A69A",
      downBorderColor: "#EF5350",
      upWickColor: "#26A69A",
      downWickColor: "#EF5350",
    },
    priceMark: {
      last: {
        upColor: "#26A69A",
        downColor: "#EF5350",
      },
    },
  },
  indicator: {
    lines: [
      { color: "#FF9800" },
      { color: "#2196F3" },
      { color: "#9C27B0" },
      { color: "#4CAF50" },
    ],
  },
  xAxis: {
    axisLine: { color: "#E0E3EB" },
    tickText: { color: "#787B86" },
    tickLine: { color: "#E0E3EB" },
  },
  yAxis: {
    axisLine: { color: "#E0E3EB" },
    tickText: { color: "#787B86" },
    tickLine: { color: "#E0E3EB" },
  },
  crosshair: {
    horizontal: {
      line: { color: "#787B86" },
      text: { backgroundColor: "#787B86" },
    },
    vertical: {
      line: { color: "#787B86" },
      text: { backgroundColor: "#787B86" },
    },
  },
};

const DARK: DeepPartial<Styles> = {
  grid: {
    horizontal: { color: "#1E222D" },
    vertical: { color: "#1E222D" },
  },
  candle: {
    type: CandleType.CandleSolid,
    bar: {
      upColor: "#26A69A",
      downColor: "#EF5350",
      noChangeColor: "#888888",
      upBorderColor: "#26A69A",
      downBorderColor: "#EF5350",
      upWickColor: "#26A69A",
      downWickColor: "#EF5350",
    },
    priceMark: {
      last: {
        upColor: "#26A69A",
        downColor: "#EF5350",
      },
    },
  },
  indicator: {
    lines: [
      { color: "#FF9800" },
      { color: "#2962FF" },
      { color: "#E040FB" },
      { color: "#00E676" },
    ],
  },
  xAxis: {
    axisLine: { color: "#1E222D" },
    tickText: { color: "#9598A1" },
    tickLine: { color: "#1E222D" },
  },
  yAxis: {
    axisLine: { color: "#1E222D" },
    tickText: { color: "#9598A1" },
    tickLine: { color: "#1E222D" },
  },
  crosshair: {
    horizontal: {
      line: { color: "#9598A1" },
      text: { backgroundColor: "#363A45" },
    },
    vertical: {
      line: { color: "#9598A1" },
      text: { backgroundColor: "#363A45" },
    },
  },
  separator: { color: "#1E222D" },
};

let registered = false;

export function registerThemes(): void {
  if (registered) return;
  registerStyles("light", LIGHT);
  registerStyles("dark", DARK);
  registered = true;
}

export function stylesFor(theme: Theme): DeepPartial<Styles> {
  return theme === "dark" ? DARK : LIGHT;
}
