import type { IndicatorCategory } from '../plugin-api';

export type IndicatorMeta = {
  name: string;
  category: IndicatorCategory;
  defaultPane: 'main' | 'sub';
  description: string;
};

export const INDICATOR_CATALOG: IndicatorMeta[] = [
  { name: 'MA', category: 'Trend', defaultPane: 'main', description: 'Moving Average' },
  { name: 'EMA', category: 'Trend', defaultPane: 'main', description: 'Exponential Moving Average' },
  { name: 'SMA', category: 'Trend', defaultPane: 'main', description: 'Simple Moving Average' },
  { name: 'BBI', category: 'Trend', defaultPane: 'main', description: 'Bull and Bear Index' },
  { name: 'BOLL', category: 'Trend', defaultPane: 'main', description: 'Bollinger Bands' },
  { name: 'SAR', category: 'Trend', defaultPane: 'main', description: 'Stop and Reverse (Parabolic)' },
  { name: 'Supertrend', category: 'Trend', defaultPane: 'main', description: 'ATR-based trend following indicator' },
  { name: 'AVP', category: 'Trend', defaultPane: 'main', description: 'Average Price' },
  { name: 'MACD', category: 'Momentum', defaultPane: 'sub', description: 'Moving Average Convergence Divergence' },
  { name: 'RSI', category: 'Momentum', defaultPane: 'sub', description: 'Relative Strength Index' },
  { name: 'KDJ', category: 'Momentum', defaultPane: 'sub', description: 'Stochastic Oscillator' },
  { name: 'CCI', category: 'Momentum', defaultPane: 'sub', description: 'Commodity Channel Index' },
  { name: 'BIAS', category: 'Momentum', defaultPane: 'sub', description: 'Bias' },
  { name: 'BRAR', category: 'Momentum', defaultPane: 'sub', description: 'BRAR' },
  { name: 'CR', category: 'Momentum', defaultPane: 'sub', description: 'CR' },
  { name: 'DMI', category: 'Momentum', defaultPane: 'sub', description: 'Directional Movement Index' },
  { name: 'DMA', category: 'Momentum', defaultPane: 'sub', description: 'Difference of Moving Averages' },
  { name: 'EMV', category: 'Momentum', defaultPane: 'sub', description: 'Ease of Movement' },
  { name: 'MTM', category: 'Momentum', defaultPane: 'sub', description: 'Momentum' },
  { name: 'PSY', category: 'Momentum', defaultPane: 'sub', description: 'Psychological Line' },
  { name: 'ROC', category: 'Momentum', defaultPane: 'sub', description: 'Rate of Change' },
  { name: 'TRIX', category: 'Momentum', defaultPane: 'sub', description: 'Triple Exponential Average' },
  { name: 'AO', category: 'Momentum', defaultPane: 'sub', description: 'Awesome Oscillator' },
  { name: 'WR', category: 'Momentum', defaultPane: 'sub', description: 'Williams %R' },
  { name: 'VOL', category: 'Volume', defaultPane: 'sub', description: 'Volume' },
  { name: 'VWAP', category: 'Volume', defaultPane: 'main', description: 'Volume Weighted Average Price' },
  { name: 'VR', category: 'Volume', defaultPane: 'sub', description: 'Volume Ratio' },
  { name: 'OBV', category: 'Volume', defaultPane: 'sub', description: 'On-Balance Volume' },
  { name: 'PVT', category: 'Volume', defaultPane: 'sub', description: 'Price-Volume Trend' },
  { name: 'ATR', category: 'Volatility', defaultPane: 'sub', description: 'Average True Range' },
];

export const INDICATOR_CATEGORIES: IndicatorCategory[] = [
  'Trend',
  'Momentum',
  'Volume',
  'Volatility',
  'Other',
];

export function isMainPane(name: string): boolean {
  const meta = INDICATOR_CATALOG.find((i) => i.name === name);
  return meta?.defaultPane === 'main';
}

export function getCatalogMeta(name: string): IndicatorMeta | undefined {
  return INDICATOR_CATALOG.find((i) => i.name === name);
}
