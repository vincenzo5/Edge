#!/usr/bin/env npx tsx
/**
 * Harness activate — stamp efficiency registry for Active Work task.
 */

import { parseEfficiencyArgs, startTask, switchTask } from "./efficiency-ledger.mts";

function main(): void {
  const argv = process.argv.slice(2);
  const parsed = parseEfficiencyArgs(argv);

  if (!parsed.name) {
    console.error(
      'Usage: npm run harness:activate -- --name "Feature — Phase N" [--session-id UUID] [--switch]',
    );
    process.exit(1);
  }

  const useSwitch = argv.includes("--switch");
  const entry = useSwitch
    ? switchTask(parsed.name, { sessionId: parsed.sessionId })
    : startTask({
        name: parsed.name,
        sessionId: parsed.sessionId,
        startedAt: parsed.startedAt,
        spendBaselineUsd: parsed.spendBaselineUsd,
      });

  console.log(
    `harness:activate — task "${entry.task_name}" started_at=${entry.started_at} status=${entry.status}`,
  );
}

main();
