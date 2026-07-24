/** Max live chart engines on the Research Board at once (focused + in-viewport). */
export const MAX_LIVE_BOARD_CHART_CARDS = 1;

/** Whether a board chart card should mount its ChartCell engine. */
export function shouldMountBoardChart(
  cardId: string,
  focusedCardId: string | null,
  visibleCardIds: ReadonlySet<string>,
): boolean {
  if (focusedCardId !== cardId) return false;
  if (!visibleCardIds.has(cardId)) return false;
  return true;
}
