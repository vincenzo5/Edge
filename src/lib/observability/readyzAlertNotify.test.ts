import { describe, expect, it, vi } from "vitest";

import {
  buildReadyzWebhookPayload,
  formatReadyzAlertText,
  postReadyzAlertWebhook,
  resolveAlertHost,
  resolveAlertWebhookUrl,
} from "./readyzAlertNotify";

describe("resolveAlertHost", () => {
  it("defaults to edge", () => {
    expect(resolveAlertHost({})).toBe("edge");
  });

  it("uses EDGE_ALERT_HOST when set", () => {
    expect(resolveAlertHost({ EDGE_ALERT_HOST: "prod-1" })).toBe("prod-1");
  });
});

describe("resolveAlertWebhookUrl", () => {
  it("returns undefined when unset", () => {
    expect(resolveAlertWebhookUrl({})).toBeUndefined();
  });

  it("returns trimmed webhook URL", () => {
    expect(
      resolveAlertWebhookUrl({
        EDGE_ALERT_WEBHOOK_URL: "https://discord.example/webhook",
      }),
    ).toBe("https://discord.example/webhook");
  });
});

describe("formatReadyzAlertText", () => {
  it("includes only reason codes for alerts", () => {
    const text = formatReadyzAlertText({
      kind: "alert",
      host: "prod-1",
      reasons: ["postgres_unavailable", "redis_unavailable"],
      consecutiveFailures: 3,
      at: "2026-07-25T12:00:00.000Z",
    });

    expect(text).toContain("host=prod-1");
    expect(text).toContain("reasons=postgres_unavailable, redis_unavailable");
    expect(text).toContain("consecutiveFailures=3");
    expect(text).not.toContain("DATABASE_URL");
  });

  it("formats recovery text", () => {
    const text = formatReadyzAlertText({
      kind: "recovery",
      host: "prod-1",
      reasons: [],
      at: "2026-07-25T12:05:00.000Z",
    });

    expect(text).toBe(
      "[Edge readyz recovery] host=prod-1 at=2026-07-25T12:05:00.000Z",
    );
  });
});

describe("buildReadyzWebhookPayload", () => {
  it("includes Discord and Slack fields", () => {
    const payload = buildReadyzWebhookPayload({
      kind: "alert",
      host: "edge",
      reasons: ["readyz_unreachable"],
      consecutiveFailures: 3,
      at: "2026-07-25T12:00:00.000Z",
    });

    expect(payload.content).toBe(payload.text);
    expect(payload.content).toContain("readyz_unreachable");
  });
});

describe("postReadyzAlertWebhook", () => {
  it("posts JSON payload to webhook URL", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));

    await postReadyzAlertWebhook(
      {
        kind: "alert",
        host: "edge",
        reasons: ["redis_unavailable"],
        consecutiveFailures: 3,
        at: "2026-07-25T12:00:00.000Z",
      },
      {
        webhookUrl: "https://hooks.example/webhook",
        fetchImpl,
      },
    );

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [, init] = fetchImpl.mock.calls[0]!;
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      content:
        "[Edge readyz alert] host=edge reasons=redis_unavailable consecutiveFailures=3 at=2026-07-25T12:00:00.000Z",
      text: "[Edge readyz alert] host=edge reasons=redis_unavailable consecutiveFailures=3 at=2026-07-25T12:00:00.000Z",
    });
  });

  it("throws when webhook URL is missing", async () => {
    await expect(
      postReadyzAlertWebhook(
        {
          kind: "alert",
          host: "edge",
          reasons: ["readyz_unreachable"],
          at: "2026-07-25T12:00:00.000Z",
        },
        { webhookUrl: undefined },
      ),
    ).rejects.toThrow("EDGE_ALERT_WEBHOOK_URL is not set");
  });
});
