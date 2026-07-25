import Redis from "ioredis";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseRedisUsedMemoryBytes,
  sampleRedisUsedMb,
  sampleSidecarRssMb,
} from "./memory-desk-sample.ts";
import * as memoryProcessRss from "./memory-process-rss.ts";

describe("parseRedisUsedMemoryBytes", () => {
  it("parses used_memory from INFO memory output", () => {
    const info = `# Memory\r\nused_memory:1048576\r\nused_memory_human:1.00M\r\n`;
    expect(parseRedisUsedMemoryBytes(info)).toBe(1_048_576);
  });

  it("returns null when used_memory is absent", () => {
    expect(parseRedisUsedMemoryBytes("# Stats\r\ntotal_commands_processed:1\r\n")).toBeNull();
  });
});

describe("sampleSidecarRssMb", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete process.env.TWS_SIDECAR_URL;
    delete process.env.TWS_SIDECAR_SECRET;
  });

  it("skips when sidecar URL is not configured", async () => {
    const result = await sampleSidecarRssMb();
    expect(result).toEqual({
      rssMb: null,
      skippedNoSidecar: true,
      note: "TWS_SIDECAR_URL not set",
    });
  });

  it("samples sidecar pid RSS when health responds", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, pid: 4242 }), { status: 200 }),
    );
    vi.spyOn(memoryProcessRss, "readPsEntries").mockReturnValue([
      { pid: 4242, ppid: 1, rssKb: 8192, comm: "python3 tws_sidecar" },
    ]);

    const result = await sampleSidecarRssMb("http://127.0.0.1:8765");

    expect(result.skippedNoSidecar).toBe(false);
    expect(result.rssMb).toBe(8);
    expect(JSON.stringify(result)).not.toMatch(/redis|secret|password/i);
  });

  it("skips when sidecar health is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await sampleSidecarRssMb("http://127.0.0.1:8765");

    expect(result).toEqual({
      rssMb: null,
      skippedNoSidecar: true,
      note: "sidecar unreachable: ECONNREFUSED",
    });
  });
});

describe("sampleRedisUsedMb", () => {
  afterEach(() => {
    delete process.env.REDIS_URL;
  });

  it("skips when REDIS_URL is not set", async () => {
    const result = await sampleRedisUsedMb();
    expect(result).toEqual({
      usedMb: null,
      skippedNoRedis: true,
      note: "REDIS_URL not set",
    });
  });

  it("does not include connection strings in skip notes", async () => {
    process.env.REDIS_URL = "redis://:supersecret@127.0.0.1:6379/0";
    const connectSpy = vi
      .spyOn(Redis.prototype, "connect")
      .mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await sampleRedisUsedMb();

    expect(result.skippedNoRedis).toBe(true);
    expect(JSON.stringify(result)).not.toContain("supersecret");
    expect(JSON.stringify(result)).not.toContain("redis://");

    connectSpy.mockRestore();
  });
});
