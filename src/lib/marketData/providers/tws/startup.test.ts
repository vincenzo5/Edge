import { spawn } from "node:child_process";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ensureSidecarOnServerBoot,
  awaitSidecarStartup,
  resetSidecarStartupForTests,
} from "./startup";
import {
  killManagedSidecar,
  resetManagedSidecarProcessForTests,
  setManagedSidecarProcessForTests,
} from "./recover";

const recoverTwsSidecar = vi.fn();

vi.mock("./recover", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./recover")>();
  return {
    ...actual,
    recoverTwsSidecar: (...args: unknown[]) => recoverTwsSidecar(...args),
  };
});

describe("ensureSidecarOnServerBoot", () => {
  beforeEach(() => {
    process.env.TWS_ENABLED = "true";
    recoverTwsSidecar.mockReset();
    resetSidecarStartupForTests();
    resetManagedSidecarProcessForTests();
  });

  afterEach(() => {
    delete process.env.TWS_ENABLED;
    resetSidecarStartupForTests();
    resetManagedSidecarProcessForTests();
  });

  it("returns immediately when TWS is not configured", async () => {
    process.env.TWS_ENABLED = "false";
    await ensureSidecarOnServerBoot();
    expect(recoverTwsSidecar).not.toHaveBeenCalled();
  });

  it("calls recoverTwsSidecar once and caches the promise", async () => {
    recoverTwsSidecar.mockResolvedValue({
      ok: true,
      commandState: "confirmed",
      action: "reconnected",
      message: "ok",
      status: { configured: true, sidecarReachable: true, gatewayConnected: true, warnings: [] },
    });

    const first = ensureSidecarOnServerBoot();
    const second = ensureSidecarOnServerBoot();
    expect(first).toBe(second);

    await first;
    await second;

    expect(recoverTwsSidecar).toHaveBeenCalledTimes(1);
    expect(recoverTwsSidecar).toHaveBeenCalledWith([], { warmup: expect.any(Function) });
  });

  it("swallows recover errors so boot never throws", async () => {
    recoverTwsSidecar.mockRejectedValue(new Error("sidecar down"));

    await expect(ensureSidecarOnServerBoot()).resolves.toBeUndefined();
  });

  it("awaitSidecarStartup resolves after ensure completes", async () => {
    let resolveRecover!: () => void;
    recoverTwsSidecar.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRecover = () =>
            resolve({
              ok: true,
              commandState: "confirmed",
              action: "reconnected",
              message: "ok",
              status: {
                configured: true,
                sidecarReachable: true,
                gatewayConnected: true,
                warnings: [],
              },
            });
        }),
    );

    const ensure = ensureSidecarOnServerBoot();
    let awaited = false;
    const wait = awaitSidecarStartup().then(() => {
      awaited = true;
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(awaited).toBe(false);

    resolveRecover();
    await ensure;
    await wait;
    expect(awaited).toBe(true);
  });

  it("awaitSidecarStartup resolves immediately when ensure was never started", async () => {
    await expect(awaitSidecarStartup()).resolves.toBeUndefined();
  });
});

describe("killManagedSidecar", () => {
  afterEach(() => {
    resetManagedSidecarProcessForTests();
  });

  it("terminates and clears the managed sidecar process", () => {
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 10_000)"]);
    setManagedSidecarProcessForTests(child);

    killManagedSidecar();

    expect(child.killed || child.signalCode === "SIGTERM").toBe(true);
    killManagedSidecar();
  });
});
