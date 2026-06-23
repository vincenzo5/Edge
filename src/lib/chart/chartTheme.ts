import type { Theme } from './contracts';
import { tradingViewChartColors } from '@/lib/design-system/tradingView';

export function getChartColors(theme: Theme) {
  return tradingViewChartColors[theme];
}
