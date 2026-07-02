import type { StreamSession } from './createStreamSession';

export const runtime = 'nodejs';

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
} as const;

export function createSseResponse(
  createSession: (send: (payload: string) => void) => StreamSession | Promise<StreamSession>,
  signal: AbortSignal,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: string) => {
        if (signal.aborted) return;
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };

      const session = await createSession(send);
      session.start(send);

      const heartbeat = setInterval(() => {
        if (signal.aborted) return;
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 30_000);

      const cleanup = () => {
        clearInterval(heartbeat);
        session.stop();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
