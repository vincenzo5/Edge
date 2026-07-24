import type { PaletteId, Theme } from "./contracts";
import { DEFAULT_PALETTE } from "./contracts";

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

const chartColors: Record<PaletteId, Record<Theme, ChartTokenSet>> = {
  midnight: {
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
      up: "#2dd4a8",
      down: "#ff5d73",
      wick: "#dce4f0",
      grid: "#171f2e",
      text: "#9aa8bc",
      crosshair: "#9aa8bc",
      lastPrice: "#6c8cff",
      axisBg: "#000000",
      axisBorder: "#273247",
    },
  },
  graphite: {
    light: {
      up: "#089981",
      down: "#f23645",
      wick: "#18181b",
      grid: "#f4f4f5",
      text: "#71717a",
      crosshair: "#71717a",
      lastPrice: "#4a6fa5",
      axisBg: "#ffffff",
      axisBorder: "#e4e4e7",
    },
    dark: {
      up: "#2dd4a8",
      down: "#ff5d73",
      wick: "#e4e4e7",
      grid: "#27272a",
      text: "#a1a1aa",
      crosshair: "#a1a1aa",
      lastPrice: "#7c9fd4",
      axisBg: "#0a0a0c",
      axisBorder: "#3f3f46",
    },
  },
  slate: {
    light: {
      up: "#089981",
      down: "#f23645",
      wick: "#1e293b",
      grid: "#e8eef4",
      text: "#64748b",
      crosshair: "#64748b",
      lastPrice: "#0e7490",
      axisBg: "#ffffff",
      axisBorder: "#d8e2ec",
    },
    dark: {
      up: "#2dd4a8",
      down: "#ff5d73",
      wick: "#d8e2ed",
      grid: "#1e2834",
      text: "#94a3b8",
      crosshair: "#94a3b8",
      lastPrice: "#5eb8d4",
      axisBg: "#0f1419",
      axisBorder: "#3d4f63",
    },
  },
};

let activePalette: PaletteId = DEFAULT_PALETTE;

export function setActiveChartPalette(palette: PaletteId): void {
  activePalette = palette;
}

export function getActiveChartPalette(): PaletteId {
  return activePalette;
}

export function getChartColors(theme: Theme, palette: PaletteId = activePalette): ChartTokenSet {
  return chartColors[palette][theme];
}
