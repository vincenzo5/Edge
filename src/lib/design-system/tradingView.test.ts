import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { THEMES } from '@/lib/chartConfig';
import { tradingViewTokens, tradingViewChartColors } from './tradingView';

type TokenKey = keyof (typeof tradingViewTokens)['light'];

function tokenKeyToCssVar(key: string): string {
  return `--tv-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
}

function parseCssCustomProperties(block: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const pattern = /(--tv-[a-z0-9-]+):\s*([^;]+);/g;
  for (const match of block.matchAll(pattern)) {
    vars[match[1]] = match[2].trim();
  }
  return vars;
}

function extractCssBlock(css: string, selector: ':root' | '.dark'): string {
  const pattern =
    selector === ':root' ? /:root\s*\{([^}]+)\}/ : /\.dark\s*\{([^}]+)\}/;
  const match = css.match(pattern);
  if (!match) {
    throw new Error(`Missing ${selector} block in globals.css`);
  }
  return match[1];
}

const globalsCss = readFileSync(
  resolve(process.cwd(), 'src/app/globals.css'),
  'utf8',
);

const lightCssVars = parseCssCustomProperties(extractCssBlock(globalsCss, ':root'));
const darkCssVars = parseCssCustomProperties(extractCssBlock(globalsCss, '.dark'));

describe('tradingViewTokens', () => {
  it('defines light and dark themes with matching token keys', () => {
    expect(Object.keys(tradingViewTokens).sort()).toEqual([...THEMES].sort());
    const lightKeys = Object.keys(tradingViewTokens.light).sort();
    const darkKeys = Object.keys(tradingViewTokens.dark).sort();
    expect(darkKeys).toEqual(lightKeys);
  });

  it('keeps chart palette values derived from theme tokens', () => {
    for (const theme of THEMES) {
      const tokens = tradingViewTokens[theme];
      const tokenValues = new Set(Object.values(tokens));
      const chart = tradingViewChartColors[theme];

      expect(chart.up).toBe(tokens.positive);
      expect(chart.down).toBe(tokens.negative);
      expect(chart.wick).toBe(tokens.textPrimary);
      expect(chart.grid).toBe(tokens.borderSubtle);
      expect(chart.text).toBe(tokens.textSecondary);
      expect(chart.crosshair).toBe(tokens.textSecondary);
      expect(chart.lastPrice).toBe(tokens.accentBlue);
      expect(chart.axisBorder).toBe(tokens.border);

      if (theme === 'light') {
        expect(chart.axisBg).toBe(tokens.surfaceChart);
      } else {
        expect(chart.axisBg).toBe(tokens.background);
      }

      for (const value of Object.values(chart)) {
        expect(tokenValues.has(value)).toBe(true);
      }
    }
  });

  it('matches globals.css light token values', () => {
    for (const key of Object.keys(tradingViewTokens.light) as TokenKey[]) {
      const cssVar = tokenKeyToCssVar(key);
      expect(lightCssVars[cssVar]).toBe(tradingViewTokens.light[key]);
    }
  });

  it('matches globals.css dark token values', () => {
    for (const key of Object.keys(tradingViewTokens.dark) as TokenKey[]) {
      const cssVar = tokenKeyToCssVar(key);
      expect(darkCssVars[cssVar]).toBe(tradingViewTokens.dark[key]);
    }
  });
});
