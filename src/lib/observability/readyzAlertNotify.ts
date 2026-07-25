import type { ReadyzReasonCode } from "./readyzProbe";

export type ReadyzAlertKind = "alert" | "recovery";

export type ReadyzAlertMessage = {
  kind: ReadyzAlertKind;
  host: string;
  reasons: ReadyzReasonCode[];
  consecutiveFailures?: number;
  at: string;
};

export function resolveAlertHost(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.EDGE_ALERT_HOST?.trim();
  return raw && raw.length > 0 ? raw : "edge";
}

export function resolveAlertWebhookUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const raw = env.EDGE_ALERT_WEBHOOK_URL?.trim();
  return raw && raw.length > 0 ? raw : undefined;
}

export function formatReadyzAlertText(message: ReadyzAlertMessage): string {
  if (message.kind === "recovery") {
    return `[Edge readyz recovery] host=${message.host} at=${message.at}`;
  }

  const reasons =
    message.reasons.length > 0 ? message.reasons.join(", ") : "unknown";
  const streak =
    typeof message.consecutiveFailures === "number"
      ? ` consecutiveFailures=${message.consecutiveFailures}`
      : "";
  return `[Edge readyz alert] host=${message.host} reasons=${reasons}${streak} at=${message.at}`;
}

export function buildReadyzWebhookPayload(message: ReadyzAlertMessage): {
  content: string;
  text: string;
} {
  const text = formatReadyzAlertText(message);
  return { content: text, text };
}

export async function postReadyzAlertWebhook(
  message: ReadyzAlertMessage,
  options: {
    webhookUrl?: string;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<void> {
  const webhookUrl =
    options.webhookUrl ?? resolveAlertWebhookUrl();
  if (!webhookUrl) {
    throw new Error("EDGE_ALERT_WEBHOOK_URL is not set");
  }

  const payload = buildReadyzWebhookPayload(message);
  const response = await (options.fetchImpl ?? fetch)(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook POST failed with status ${response.status}`);
  }
}
