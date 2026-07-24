import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  LOCAL_ERROR_LOG_RETENTION,
  appendLocalError,
  readLocalErrorLog,
} from "./localErrorLogStore";

describe("localErrorLog", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function tempLogPath(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "edge-local-error-log-"));
    tempDirs.push(dir);
    return path.join(dir, "error-log.jsonl");
  }

  it("appends redacted entries and reads them back", () => {
    const logPath = tempLogPath();
    const entry = appendLocalError(
      {
        source: "chart",
        message: "Chart render failed accountId=DU123456",
        stack: "Error: boom\nBearer abc.def.ghi",
      },
      { logPath },
    );

    expect(entry).not.toBeNull();
    expect(entry?.message).not.toMatch(/DU123456/);
    expect(entry?.stack).not.toMatch(/Bearer abc/);

    const rows = readLocalErrorLog(10, { logPath });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.source).toBe("chart");
  });

  it("retains only the last N entries", () => {
    const logPath = tempLogPath();
    for (let index = 0; index < LOCAL_ERROR_LOG_RETENTION + 5; index += 1) {
      appendLocalError(
        { source: "test", message: `entry-${index}` },
        { logPath },
      );
    }

    const rawLines = fs.readFileSync(logPath, "utf8").trim().split("\n");
    expect(rawLines).toHaveLength(LOCAL_ERROR_LOG_RETENTION);
    expect(rawLines[0]).toContain("entry-5");
    expect(rawLines.at(-1)).toContain(`entry-${LOCAL_ERROR_LOG_RETENTION + 4}`);
  });

  it("does not throw when the log path is not writable", () => {
    const logPath = path.join(os.tmpdir(), "edge-local-error-log-missing", "nested", "error-log.jsonl");
    expect(() =>
      appendLocalError({ source: "api", message: "failed" }, { logPath: "/\0bad" }),
    ).not.toThrow();
  });
});
