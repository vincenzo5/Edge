#!/usr/bin/env npx tsx
/**
 * Harness activate — stamp efficiency registry for Active Work task.
 * Phase 9: default switchTask (idempotent resume); --strict uses startTask with throw-on-duplicate.
 */

import { parseEfficiencyArgs, startTask, switchTask } from "./efficiency-ledger.mts";

function main(): void {
  const argv = process.argv.slice(2);
  const parsed = parseEfficiencyArgs(argv);

  if (!parsed.name) {
    console.error(
      'Usage: npm run harness:activate -- --name "Feature — Phase N" [--session-id UUID] [--strict]',
    );
    process.exit(1);
  }

  const useStrict = argv.includes("--strict");
  const entry = useStrict
    ? startTask({
        name: parsed.name,
        sessionId: parsed.sessionId,
        startedAt: parsed.startedAt,
        spendBaselineUsd: parsed.spendBaselineUsd,
        strict: true,
      })
    : switchTask(parsed.name, { sessionId: parsed.sessionId });

  console.log(
    `harness:activate — task "${entry.task_name}" started_at=${entry.started_at} status=${entry.status}`,
  );
}

main();
