import { z } from "zod";

export const CHANNEL_NAME = "edge-screener-review-v1";

const setSymbolMessageSchema = z.object({
  type: z.literal("setSymbol"),
  symbol: z.string().min(1),
  name: z.string().optional(),
  exchange: z.string().optional(),
  source: z.literal("screener"),
  ts: z.number(),
});

const helloMessageSchema = z.object({
  type: z.literal("hello"),
});

const chartReadyMessageSchema = z.object({
  type: z.literal("chartReady"),
});

export const reviewChannelMessageSchema = z.discriminatedUnion("type", [
  setSymbolMessageSchema,
  helloMessageSchema,
  chartReadyMessageSchema,
]);

export type ReviewChannelMessage = z.infer<typeof reviewChannelMessageSchema>;
export type SetSymbolMessage = z.infer<typeof setSymbolMessageSchema>;

export function parseReviewChannelMessage(raw: unknown): ReviewChannelMessage | null {
  const result = reviewChannelMessageSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function createSetSymbolMessage(
  symbol: string,
  name?: string,
  exchange?: string,
): SetSymbolMessage {
  return {
    type: "setSymbol",
    symbol,
    ...(name !== undefined ? { name } : {}),
    ...(exchange !== undefined ? { exchange } : {}),
    source: "screener",
    ts: Date.now(),
  };
}

export function isReviewChannelSupported(): boolean {
  return typeof BroadcastChannel !== "undefined";
}

function openChannel(): BroadcastChannel | null {
  if (!isReviewChannelSupported()) return null;
  return new BroadcastChannel(CHANNEL_NAME);
}

function publishReviewChannelMessage(message: ReviewChannelMessage): void {
  const channel = openChannel();
  if (!channel) return;
  try {
    channel.postMessage(message);
  } finally {
    channel.close();
  }
}

export function publishReviewSetSymbol(
  symbol: string,
  name?: string,
  exchange?: string,
): void {
  publishReviewChannelMessage(createSetSymbolMessage(symbol, name, exchange));
}

export function publishReviewChartReady(): void {
  publishReviewChannelMessage({ type: "chartReady" });
}

export function subscribeReviewChannel(
  handler: (message: ReviewChannelMessage) => void,
): () => void {
  const channel = openChannel();
  if (!channel) {
    return () => {};
  }

  const listener = (event: MessageEvent) => {
    const parsed = parseReviewChannelMessage(event.data);
    if (parsed) handler(parsed);
  };

  channel.addEventListener("message", listener);
  return () => {
    channel.removeEventListener("message", listener);
    channel.close();
  };
}
