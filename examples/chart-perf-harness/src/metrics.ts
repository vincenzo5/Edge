import type { PerfMetrics } from "./types.js";

const FRAME_BUDGET_MS = 1000 / 60;

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index] ?? 0;
}

export function summarizeFrameDurations(frameDurationsMs: number[]): Pick<
  PerfMetrics,
  "averageFrameMs" | "p50FrameMs" | "p95FrameMs" | "maxFrameMs" | "droppedFramePercent" | "frameSamples"
> {
  if (frameDurationsMs.length === 0) {
    return {
      averageFrameMs: 0,
      p50FrameMs: 0,
      p95FrameMs: 0,
      maxFrameMs: 0,
      droppedFramePercent: 0,
      frameSamples: 0,
    };
  }

  const total = frameDurationsMs.reduce((sum, value) => sum + value, 0);
  const dropped = frameDurationsMs.filter((value) => value > FRAME_BUDGET_MS).length;

  return {
    averageFrameMs: round(total / frameDurationsMs.length),
    p50FrameMs: round(percentile(frameDurationsMs, 50)),
    p95FrameMs: round(percentile(frameDurationsMs, 95)),
    maxFrameMs: round(Math.max(...frameDurationsMs)),
    droppedFramePercent: round((dropped / frameDurationsMs.length) * 100),
    frameSamples: frameDurationsMs.length,
  };
}

export function measureDuration(run: () => void): number {
  const start = performance.now();
  run();
  return round(performance.now() - start);
}

export async function measureAsyncDuration(run: () => Promise<void>): Promise<number> {
  const start = performance.now();
  await run();
  return round(performance.now() - start);
}

export function waitForAnimationFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    let remaining = count;
    const step = () => {
      remaining -= 1;
      if (remaining <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

export async function measureFramesDuring(
  durationMs: number,
  onFrame?: (frameIndex: number) => void,
): Promise<number[]> {
  const frames: number[] = [];
  let last = performance.now();
  const start = last;

  return new Promise((resolve) => {
    const tick = (now: number) => {
      frames.push(now - last);
      last = now;
      onFrame?.(frames.length - 1);
      if (now - start >= durationMs) resolve(frames);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
