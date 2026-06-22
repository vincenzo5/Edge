import type { Theme } from './contracts';

const COLORS = {
  light: {
    up: '#22c55e',
    down: '#ef4444',
    wick: '#111827',
    grid: '#e5e7eb',
    text: '#374151',
    crosshair: '#9ca3af',
    lastPrice: '#3b82f6',
    axisBg: '#f3f4f6',
    axisBorder: '#e5e7eb',
  },
  dark: {
    up: '#22c55e',
    down: '#ef4444',
    wick: '#f3f4f6',
    grid: '#374151',
    text: '#9ca3af',
    crosshair: '#6b7280',
    lastPrice: '#60a5fa',
    axisBg: '#12131A',
    axisBorder: '#1E2030',
  },
};

export function getChartColors(theme: Theme) {
  return COLORS[theme];
}
