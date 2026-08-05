import { z } from "zod";

export const CHANNEL_NAME = "edge-journal-capture-v1";

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
  if (!channel) return;
  try {
    channel.postMessage(message);
  } finally {
    channel.close();
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
  if (!channel) {
    return () => {};
  }

  const listener = (event: MessageEvent) => {
    const parsed = parseCaptureChannelMessage(event.data);
    if (parsed) handler(parsed);
  };

  channel.addEventListener("message", listener);
  return () => {
    channel.removeEventListener("message", listener);
    channel.close();
  };
}
