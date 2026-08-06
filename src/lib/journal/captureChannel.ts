import { z } from "zod";

export const CHANNEL_NAME = "edge-journal-capture-v1";
export const STORAGE_KEY = "edge-journal-capture-event-v1";

const captureDoneMessageSchema = z.object({
  type: z.literal("captureDone"),
  requestId: z.string().min(1),
  tradeId: z.string().min(1),
  screenshotId: z.string().min(1),
  snapshotId: z.string().min(1),
});

const captureCancelledMessageSchema = z.object({
  type: z.literal("captureCancelled"),
  requestId: z.string().min(1),
  tradeId: z.string().min(1),
});

const captureFailedMessageSchema = z.object({
  type: z.literal("captureFailed"),
  requestId: z.string().min(1),
  tradeId: z.string().min(1),
  error: z.string().min(1),
});

export const captureChannelMessageSchema = z.discriminatedUnion("type", [
  captureDoneMessageSchema,
  captureCancelledMessageSchema,
  captureFailedMessageSchema,
]);

export type CaptureChannelMessage = z.infer<typeof captureChannelMessageSchema>;
export type CaptureDoneMessage = z.infer<typeof captureDoneMessageSchema>;
export type CaptureCancelledMessage = z.infer<typeof captureCancelledMessageSchema>;
export type CaptureFailedMessage = z.infer<typeof captureFailedMessageSchema>;

export function parseCaptureChannelMessage(raw: unknown): CaptureChannelMessage | null {
  const result = captureChannelMessageSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function isCaptureChannelSupported(): boolean {
  return typeof BroadcastChannel !== "undefined";
}

function openChannel(): BroadcastChannel | null {
  if (!isCaptureChannelSupported()) return null;
  return new BroadcastChannel(CHANNEL_NAME);
}

function publishCaptureChannelMessage(message: CaptureChannelMessage): void {
  const channel = openChannel();
  if (channel) {
    try {
      channel.postMessage(message);
    } finally {
      channel.close();
    }
  }

  if (typeof window === "undefined") return;

  try {
    window.opener?.postMessage(message, window.location.origin);
  } catch {
    // BroadcastChannel and storage remain available when opener messaging is blocked.
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        message,
        nonce: `${Date.now()}-${Math.random()}`,
      }),
    );
  } catch {
    // Cross-window storage can be unavailable in privacy-restricted contexts.
  }
}

export function publishCaptureDone(args: Omit<CaptureDoneMessage, "type">): void {
  publishCaptureChannelMessage({ type: "captureDone", ...args });
}

export function publishCaptureCancelled(args: Omit<CaptureCancelledMessage, "type">): void {
  publishCaptureChannelMessage({ type: "captureCancelled", ...args });
}

export function publishCaptureFailed(args: Omit<CaptureFailedMessage, "type">): void {
  publishCaptureChannelMessage({ type: "captureFailed", ...args });
}

export function subscribeCaptureChannel(
  handler: (message: CaptureChannelMessage) => void,
): () => void {
  const channel = openChannel();
  const delivered = new Set<string>();

  const deliver = (raw: unknown) => {
    const parsed = parseCaptureChannelMessage(raw);
    if (!parsed) return;
    const key = JSON.stringify(parsed);
    if (delivered.has(key)) return;
    delivered.add(key);
    globalThis.setTimeout(() => delivered.delete(key), 2_000);
    handler(parsed);
  };

  const listener = (event: MessageEvent) => {
    deliver(event.data);
  };

  const windowMessageListener = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    deliver(event.data);
  };

  const storageListener = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const payload = JSON.parse(event.newValue) as { message?: unknown };
      deliver(payload.message);
    } catch {
      // Ignore malformed or unrelated local storage values.
    }
  };

  channel?.addEventListener("message", listener);
  if (typeof window !== "undefined") {
    window.addEventListener("message", windowMessageListener);
    window.addEventListener("storage", storageListener);
  }

  return () => {
    channel?.removeEventListener("message", listener);
    channel?.close();
    if (typeof window !== "undefined") {
      window.removeEventListener("message", windowMessageListener);
      window.removeEventListener("storage", storageListener);
    }
  };
}
