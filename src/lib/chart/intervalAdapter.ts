import type { Interval } from './contracts';
import type { Interval as YahooInterval } from '@/lib/yahoo';

export type FetchIntervalResolution = {
  /** Interval passed to the data provider (Yahoo). */
  providerInterval: YahooInterval;
  /** When set, aggregate provider candles into this domain interval after fetch. */
  resampleTo?: Interval;
};

export {
  intervalToMs,
  resampleCandlesTo2h,
  applyIntervalResample,
  resolveFetchInterval,
} from '@edge/chart-core';
