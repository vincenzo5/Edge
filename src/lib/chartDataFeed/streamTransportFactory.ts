import { createPollingStreamTransport } from './pollingStreamTransport';
import { createServerProxiedStreamTransport } from './serverProxiedStreamTransport';
import type { StreamTransportFactory, StreamTransportOptions } from './streamTransport';
import { resolveStreamTransportMode } from './streamTransport';

export { createPollingStreamTransport } from './pollingStreamTransport';
export { createServerProxiedStreamTransport } from './serverProxiedStreamTransport';

/** Resolves polling vs server-proxied SSE from options or NEXT_PUBLIC_STREAM_TRANSPORT. */
export function createStreamTransport(options?: StreamTransportOptions): ReturnType<StreamTransportFactory> {
  const mode = resolveStreamTransportMode(options);
  if (mode === 'server-proxied') {
    return createServerProxiedStreamTransport(options);
  }
  return createPollingStreamTransport(options);
}

export const defaultStreamTransportFactory: StreamTransportFactory = createStreamTransport;
