#!/usr/bin/env npx tsx

import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { formatReadyzAlertText } from "../src/lib/observability/readyzAlertNotify.ts";
import { runReadyzAlertTick } from "../src/lib/observability/readyzAlertRun.ts";

function parseArgs(argv: string[]): {
  dryRun: boolean;
  loop: boolean;
  intervalMs: number;
} {
  const dryRun = argv.includes("--dry-run");
  const loop = argv.includes("--loop");
  const intervalIndex = argv.indexOf("--interval-ms");
  const intervalMs =
    intervalIndex >= 0 && argv[intervalIndex + 1]
      ? Number.parseInt(argv[intervalIndex + 1]!, 10)
      : 60_000;

  if (!Number.isFinite(intervalMs) || intervalMs < 1_000) {
    throw new Error("--interval-ms must be an integer >= 1000");
  }

  return { dryRun, loop, intervalMs };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runOnce(dryRun: boolean): Promise<void> {
  const result = await runReadyzAlertTick({ dryRun });

  const probeSummary = result.probe.ok
    ? "readyz ok"
    : `readyz failed (${result.probe.reasons.join(", ")})`;
  console.log(probeSummary);

  if (result.message) {
    const line = formatReadyzAlertText(result.message);
    if (dryRun) {
      console.log(`[dry-run] would notify: ${line}`);
    } else if (result.notified) {
      console.log(`notified: ${line}`);
    }
  }
}

async function main(): Promise<void> {
  const { dryRun, loop, intervalMs } = parseArgs(process.argv.slice(2));

  if (!loop) {
    await runOnce(dryRun);
    return;
  }

  for (;;) {
    await runOnce(dryRun);
    await sleep(intervalMs);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
