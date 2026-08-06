/**
 * Copilot message list scroll contract (Phase 0 freeze).
 *
 * Policy:
 * - Stick to bottom while the user is near the bottom during send + stream.
 * - Unpin as soon as the user scrolls up — stay unpinned even while still inside
 *   the near-bottom threshold so slow scrolls are not yanked back to the end.
 * - Re-pin only when the user scrolls back down into the near-bottom zone,
 *   clicks jump-to-latest, or sends a new message.
 * - Do not yank the viewport when the user has scrolled away from the bottom.
 */
export const NEAR_BOTTOM_THRESHOLD_PX = 96;

export function distanceFromBottom(element: HTMLElement): number {
  return element.scrollHeight - element.scrollTop - element.clientHeight;
}

export function isNearBottom(
  element: HTMLElement,
  thresholdPx: number = NEAR_BOTTOM_THRESHOLD_PX,
): boolean {
  return distanceFromBottom(element) <= thresholdPx;
}
