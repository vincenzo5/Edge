import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runReadyzAlertTick } from "./readyzAlertRun";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function tempStatePath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "readyz-alert-run-"));
  tempDirs.push(dir);
  return path.join(dir, "readyz-alert-state.json");
}

describe("runReadyzAlertTick", () => {
  it("does not notify on first failure", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json(
        { ok: false, reasons: ["postgres_unavailable"] },
        { status: 503 },
      ),
    );

    const result = await runReadyzAlertTick({
      fetchImpl,
      statePath: tempStatePath(),
      threshold: 3,
      host: "test-host",
      now: () => new Date("2026-07-25T12:00:00.000Z"),
    });

    expect(result.notified).toBe(false);
    expect(result.transition).toEqual({ kind: "none" });
  });

  it("notifies after threshold in non-dry-run mode", async () => {
    const statePath = tempStatePath();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { ok: false, reasons: ["postgres_unavailable"] },
          { status: 503 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json(
          { ok: false, reasons: ["postgres_unavailable"] },
          { status: 503 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json(
          { ok: false, reasons: ["postgres_unavailable"] },
          { status: 503 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    for (let i = 0; i < 2; i += 1) {
      await runReadyzAlertTick({
        fetchImpl,
        statePath,
        threshold: 3,
        webhookUrl: "https://hooks.example/webhook",
        now: () => new Date("2026-07-25T12:00:00.000Z"),
      });
    }

    const result = await runReadyzAlertTick({
      fetchImpl,
      statePath,
      threshold: 3,
      host: "test-host",
      now: () => new Date("2026-07-25T12:01:00.000Z"),
      webhookUrl: "https://hooks.example/webhook",
    });

    expect(result.notified).toBe(true);
    expect(result.transition.kind).toBe("alert");
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("dry-run returns message without webhook POST", async () => {
    const statePath = tempStatePath();
    const fetchImpl = vi.fn(async () =>
      Response.json(
        { ok: false, reasons: ["readyz_unreachable"] },
        { status: 503 },
      ),
    );

    for (let i = 0; i < 2; i += 1) {
      await runReadyzAlertTick({
        dryRun: true,
        fetchImpl,
        statePath,
        threshold: 3,
      });
    }

    const result = await runReadyzAlertTick({
      dryRun: true,
      fetchImpl,
      statePath,
      threshold: 3,
      host: "dry-host",
      now: () => new Date("2026-07-25T12:02:00.000Z"),
    });

    expect(result.notified).toBe(false);
    expect(result.message).toEqual({
      kind: "alert",
      host: "dry-host",
      reasons: ["readyz_unreachable"],
      consecutiveFailures: 3,
      at: "2026-07-25T12:02:00.000Z",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
