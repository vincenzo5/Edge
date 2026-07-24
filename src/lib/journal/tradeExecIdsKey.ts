/** Stable grouping key for round-trip trades — matches rebuildTrades preservation. */
export function tradeExecIdsKey(fillExecIds: string[]): string {
  return fillExecIds.slice().sort().join("|");
}
