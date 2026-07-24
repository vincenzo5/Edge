import type { PaletteId, Theme } from './contracts';
import { DEFAULT_PALETTE } from './contracts';
import { getEdgeChartColors } from '@/lib/design-system/edge';

export function getChartColors(theme: Theme, palette: PaletteId = DEFAULT_PALETTE) {
  return getEdgeChartColors(palette, theme);
}
