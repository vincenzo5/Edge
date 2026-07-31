import type { PlaybookRule } from "@/lib/trading/playbook/types";

/** Default unset binding matches legacy Manage-only rules. */
export function resolveExitRuleBinding(rule: PlaybookRule): NonNullable<PlaybookRule["binding"]> {
  return rule.binding ?? "managedApp";
}

/** Evaluator runs only managedApp exits; Protect stays at broker. */
export function isManagedAppExitRule(rule: PlaybookRule): boolean {
  return resolveExitRuleBinding(rule) === "managedApp";
}
