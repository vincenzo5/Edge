import type { Theme } from "./contracts";

type ChartTokenSet = {
  up: string;
  down: string;
  wick: string;
  grid: string;
  text: string;
  crosshair: string;
  lastPrice: string;
  axisBg: string;
  axisBorder: string;
};

const chartColors: Record<Theme, ChartTokenSet> = {
  light: {
    up: "#089981",
    down: "#f23645",
    wick: "#131722",
    grid: "#eff2f5",
    text: "#787b86",
    crosshair: "#787b86",
    lastPrice: "#2962ff",
    axisBg: "#ffffff",
    axisBorder: "#e0e3eb",
  },
  dark: {
    up: "#22ab94",
    down: "#f23645",
    wick: "#d1d4dc",
    grid: "#2a2e39",
    text: "#787b86",
    crosshair: "#787b86",
    lastPrice: "#2962ff",
    axisBg: "#131722",
    axisBorder: "#2a2e39",
  },
};

export function getChartColors(theme: Theme): ChartTokenSet {
  return chartColors[theme];
}
