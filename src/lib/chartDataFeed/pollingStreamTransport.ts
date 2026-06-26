import type { StreamTransport, StreamTransportOptions } from './streamTransport';
import {
  candlePollIntervalMs,
  createPollingCandleSubscription,
  createPollingQuoteSubscription,
  QUOTE_POLL_INTERVAL_MS,
} from './pollStreamAdapter';

/** Default transport: interval REST polling with client-side diffing. */
export function createPollingStreamTransport(_options?: StreamTransportOptions): StreamTransport {
  return {
    subscribeCandles(request, sink, loadLatest) {
      return createPollingCandleSubscription(
        loadLatest,
        candlePollIntervalMs(request.interval),
        sink,
      );
    },

    subscribeQuotes(_request, sink, loadLatest) {
      return createPollingQuoteSubscription(loadLatest, QUOTE_POLL_INTERVAL_MS, sink);
    },
  };
}
