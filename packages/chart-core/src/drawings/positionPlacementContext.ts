export type PositionPlacementOptions = {
  targetRMultiple?: number;
};

let pending: PositionPlacementOptions | null = null;

/** App sets options immediately before instant long/short placement. */
export function setPendingPositionPlacementOptions(options: PositionPlacementOptions): void {
  pending = options;
}

/** Read once per create — avoids stale options on later tools. */
export function consumePendingPositionPlacementOptions(): PositionPlacementOptions {
  const opts = pending ?? {};
  pending = null;
  return opts;
}

/** Test helper. */
export function resetPendingPositionPlacementOptions(): void {
  pending = null;
}
