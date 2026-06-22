import type { Interval, Range } from './contracts';

/** Default bar size for each bottom-bar range preset (TradingView parity). */
export function intervalForRange(range: Range): Interval {
  switch (range) {
    case '1d':
      return '1m';
    case '5d':
      return '5m';
    case '1mo':
      return '30m';
    case '3mo':
      return '1h';
    case '6mo':
      return '2h';
    case 'ytd':
    case '1y':
    case '2y':
      return '1d';
    case '5y':
      return '1wk';
    case 'max':
      return '1mo';
    default:
      return '1d';
  }
}
