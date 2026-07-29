/**
 * Copilot message list scroll contract (Phase 0 freeze).
 *
 * Policy:
 * - Stick to bottom while the user is near the bottom during send + stream.
 * - Unpin when the user scrolls up (wheel, touch, pointer, keyboard away from bottom).
 * - Jump-to-latest control re-pins and scrolls to the end.
 * - Do not yank the viewport when the user has scrolled away from the bottom.
 */
export const NEAR_BOTTOM_THRESHOLD_PX = 96;

export function isNearBottom(
  element: HTMLElement,
  thresholdPx: number = NEAR_BOTTOM_THRESHOLD_PX,
): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= thresholdPx;
}
