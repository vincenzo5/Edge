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
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let session: StreamSession | null = null;
  let cleaned = false;
  let cleanupFn: (() => void) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        session?.stop();
        signal.removeEventListener('abort', onAbort);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      const onAbort = () => cleanup();
      cleanupFn = () => cleanup();

      const send = (payload: string) => {
        if (signal.aborted || cleaned) return;
        try {
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          cleanup();
        }
      };

      signal.addEventListener('abort', onAbort, { once: true });

      try {
        session = await createSession(send);
        session.start(send);

        heartbeat = setInterval(() => {
          if (signal.aborted || cleaned) return;
          try {
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          } catch {
            cleanup();
          }
        }, 30_000);
      } catch (error) {
        cleanup();
        throw error;
      }
    },
    cancel() {
      cleanupFn?.();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
