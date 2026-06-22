import { describe, expect, it } from 'vitest';
import {
  CHART_TYPE_MENU,
  INTERVAL_MENU,
  groupChartTypeMenu,
  groupIntervalMenu,
  intervalShortLabel,
} from './chartHeaderMetadata';

describe('chartHeaderMetadata', () => {
  it('groups interval menu by category', () => {
    const grouped = groupIntervalMenu();
    expect(grouped.minutes.some((i) => i.interval === '5m' && i.implemented)).toBe(true);
    expect(grouped.ticks.every((i) => !i.implemented)).toBe(true);
  });

  it('groups chart type menu by section', () => {
    const grouped = groupChartTypeMenu();
    expect(grouped.candle.some((i) => i.chartType === 'candle_solid')).toBe(true);
    expect(grouped.advanced.every((i) => !i.implemented)).toBe(true);
  });

  it('formats interval short labels like TradingView', () => {
    expect(intervalShortLabel('1d')).toBe('D');
    expect(intervalShortLabel('1wk')).toBe('W');
    expect(intervalShortLabel('1mo')).toBe('M');
  });

  it('marks unsupported chart types as disabled', () => {
    const renko = CHART_TYPE_MENU.find((i) => i.id === 'renko');
    expect(renko?.implemented).toBe(false);
    expect(renko?.disabledReason).toBeTruthy();
  });

  it('includes all implemented intervals in menu', () => {
    const implemented = INTERVAL_MENU.filter((i) => i.implemented).map((i) => i.interval);
    expect(implemented).toContain('1m');
    expect(implemented).toContain('1d');
    expect(implemented).toContain('1mo');
  });
});
