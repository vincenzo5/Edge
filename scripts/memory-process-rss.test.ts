import { describe, expect, it } from "vitest";
import {
  collectDescendantPids,
  isRendererCommand,
  lookupPidRssBytes,
  parsePsOutput,
  selectProcessRssBytes,
} from "./memory-process-rss.ts";

describe("parsePsOutput", () => {
  it("parses pid ppid rss comm rows", () => {
    const output = `
  1000     1   12345 Chromium
  1001  1000   45678 Google Chrome Helper (Renderer)
  1002  1000    2048 Google Chrome Helper
    `;

    expect(parsePsOutput(output)).toEqual([
      { pid: 1000, ppid: 1, rssKb: 12345, comm: "Chromium" },
      { pid: 1001, ppid: 1000, rssKb: 45678, comm: "Google Chrome Helper (Renderer)" },
      { pid: 1002, ppid: 1000, rssKb: 2048, comm: "Google Chrome Helper" },
    ]);
  });
});

describe("isRendererCommand", () => {
  it("matches renderer helper and headless-shell renderer processes", () => {
    expect(isRendererCommand("Google Chrome Helper (Renderer)")).toBe(true);
    expect(isRendererCommand("Chromium Helper (Renderer)")).toBe(true);
    expect(
      isRendererCommand(
        "/path/chrome-headless-shell --type=renderer --headless=old --no-sandbox",
      ),
    ).toBe(true);
    expect(isRendererCommand("Chromium")).toBe(false);
    expect(isRendererCommand("/path/chrome-headless-shell --type=gpu-process")).toBe(false);
  });
});

describe("collectDescendantPids", () => {
  it("walks the process tree from root", () => {
    const entries = parsePsOutput(`
  1000     1   100 Chromium
  1001  1000   200 Google Chrome Helper (Renderer)
  1002  1000   300 Google Chrome Helper
  2000     1   400 Firefox
    `);

    expect([...collectDescendantPids(entries, 1000)].sort()).toEqual([1000, 1001, 1002]);
  });
});

describe("selectProcessRssBytes", () => {
  it("prefers max renderer RSS in the browser tree", () => {
    const entries = parsePsOutput(`
  1000     1   10000 /path/chrome-headless-shell --headless
  1001  1000   50000 /path/chrome-headless-shell --type=renderer --headless=old
  1002  1000    8000 /path/chrome-headless-shell --type=gpu-process
    `);

    expect(selectProcessRssBytes(entries, 1000)).toEqual({
      bytes: 50000 * 1024,
      method: "os-ps-max-renderer",
      selectedPid: 1001,
    });
  });

  it("falls back to browser root RSS when no renderer is present", () => {
    const entries = parsePsOutput(`
  1000     1   12000 Chromium
  1002  1000    8000 Google Chrome Helper
    `);

    expect(selectProcessRssBytes(entries, 1000)).toEqual({
      bytes: 12000 * 1024,
      method: "os-ps-browser-fallback",
      selectedPid: 1000,
    });
  });

  it("returns null when root pid is missing", () => {
    const entries = parsePsOutput(`1001 1000 50000 Google Chrome Helper (Renderer)`);
    expect(selectProcessRssBytes(entries, 1000)).toBeNull();
  });
});

describe("lookupPidRssBytes", () => {
  it("returns RSS bytes for an exact pid", () => {
    const entries = parsePsOutput(`
  1000     1   12000 python3 tws_sidecar
  1001  1000   50000 Google Chrome Helper (Renderer)
    `);

    expect(lookupPidRssBytes(entries, 1000)).toBe(12000 * 1024);
    expect(lookupPidRssBytes(entries, 1001)).toBe(50000 * 1024);
  });

  it("returns null when pid is missing or invalid", () => {
    const entries = parsePsOutput(`1000 1 12000 python3`);
    expect(lookupPidRssBytes(entries, 9999)).toBeNull();
    expect(lookupPidRssBytes(entries, Number.NaN)).toBeNull();
  });
});
