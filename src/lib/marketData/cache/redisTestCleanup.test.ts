import { describe, expect, it, vi } from "vitest";

import { clearRedisEnvKeys, redisEnvKeyPattern } from "./redisTestCleanup";

describe("redisTestCleanup", () => {
  it("builds a scoped scan pattern for one deploy env", () => {
    expect(redisEnvKeyPattern("dev")).toBe("edge:dev:1:md:*");
    expect(redisEnvKeyPattern("prod")).toBe("edge:prod:1:md:*");
  });

  it("deletes only keys matching the env prefix", async () => {
    const keys = new Set<string>([
      "edge:dev:1:md:hot:entry:a",
      "edge:prod:1:md:hot:entry:b",
      "edge:legacy:md:hot:entry:c",
    ]);
    const scan = vi
      .fn()
      .mockResolvedValueOnce(["0", ["edge:dev:1:md:hot:entry:a"]])
      .mockResolvedValueOnce(["0", []]);
    const del = vi.fn(async (...batch: string[]) => {
      for (const key of batch) keys.delete(key);
      return batch.length;
    });

    const deleted = await clearRedisEnvKeys(
      { scan, del } as never,
      "dev",
    );

    expect(deleted).toBe(1);
    expect(keys.has("edge:dev:1:md:hot:entry:a")).toBe(false);
    expect(keys.has("edge:prod:1:md:hot:entry:b")).toBe(true);
    expect(scan).toHaveBeenCalledWith("0", "MATCH", "edge:dev:1:md:*", "COUNT", 100);
  });
});
