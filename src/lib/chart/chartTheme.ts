import type { Theme } from './contracts';
import { edgeChartColors } from '@/lib/design-system/edge';

export function getChartColors(theme: Theme) {
  return edgeChartColors[theme];
}
