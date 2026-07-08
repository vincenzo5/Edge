import type { AccountExecution } from "@/lib/marketData/contracts/brokerage";
import type { JournalFill, JournalFillSource } from "@/lib/journal/types";
import { mapExecutionToJournalFill, mergeJournalFills } from "@/lib/journal/mapExecutionToFill";

export function mapExecutionsToJournalFills(
  executions: AccountExecution[],
  source: JournalFillSource = "live",
): JournalFill[] {
  const mapped: JournalFill[] = [];
  for (const execution of executions) {
    const fill = mapExecutionToJournalFill(execution, source);
    if (fill) mapped.push(fill);
  }
  return mapped;
}

export function syncExecutionsIntoFills(
  existingFills: JournalFill[],
  executions: AccountExecution[],
  source: JournalFillSource = "live",
): { fills: JournalFill[]; added: number; duplicates: number } {
  const incoming = mapExecutionsToJournalFills(executions, source);
  const before = new Set(existingFills.map((fill) => fill.execId));
  const merged = mergeJournalFills(existingFills, incoming);
  const added = merged.filter((fill) => !before.has(fill.execId)).length;
  return {
    fills: merged,
    added,
    duplicates: incoming.length - added,
  };
}
