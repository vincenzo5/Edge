import { chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  collectSurfaceMetricsInPage,
  normalizeSurfaceMetrics,
  surfacePolicyPass,
} from "./memory-baseline-metrics.ts";

describe("collectSurfaceMetricsInPage (Playwright L5)", () => {
  let browser: Awaited<ReturnType<typeof chromium.launch>>;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser?.close();
  });

  it("counts DOM canvases and live WebGL counter", async () => {
    const page = await browser.newPage();
    await page.setContent(`
      <canvas id="pane"></canvas>
      <canvas id="crosshair"></canvas>
      <script>globalThis.__edgeWebGLLiveContextCount = 2;</script>
    `);

    const raw = await page.evaluate(collectSurfaceMetricsInPage);
    const l5 = normalizeSurfaceMetrics(raw);

    expect(l5.canvasCount).toBe(2);
    expect(l5.webglContextCount).toBe(2);
    expect(l5.gpuMemoryMb).toBeNull();
    expect(l5.gpuMemoryNote).toContain("OffscreenCanvas");

    expect(surfacePolicyPass(8, 8, l5.canvasCount, 0)).toBe(true);
    expect(surfacePolicyPass(8, 1, 8, 0)).toBe(false);

    await page.close();
  });
});
