import type { Chart } from "klinecharts";
import type { SerializedDrawing, TrackedOverlay } from "./chartConfig";

/**
 * Serialize all tracked overlays using chart.getOverlayById for each ID.
 * Falls back to internal _panes access for overlays not in the tracked set.
 */
export function serializeOverlays(
  chart: Chart | null,
  trackedIds: Set<string>,
): SerializedDrawing[] {
  if (!chart) return [];

  const out: SerializedDrawing[] = [];
  for (const id of trackedIds) {
    try {
      const o = chart.getOverlayById(id) as Record<string, unknown> | null;
      if (!o) continue;
      out.push(extractDrawing(o));
    } catch {
      // Overlay may have been removed externally; skip.
    }
  }

  // Also capture any overlays not in the tracked set (from prior sessions).
  const anyChart = chart as unknown as {
    _panes?: Map<string, { overlays: Map<string, unknown> }>;
  };
  if (anyChart._panes) {
    for (const pane of anyChart._panes.values()) {
      if (!pane?.overlays) continue;
      for (const [id, o] of pane.overlays) {
        if (trackedIds.has(id)) continue;
        out.push(extractDrawing(o as Record<string, unknown>));
      }
    }
  }

  return out;
}

function extractDrawing(o: Record<string, unknown>): SerializedDrawing {
  return {
    name: String(o.name ?? ""),
    label: String(o.label ?? o.name ?? ""),
    points: ((o.points as Array<Record<string, number>>) ?? []).map((p) => ({
      dataIndex: p.dataIndex,
      timestamp: p.timestamp,
      value: p.value,
    })),
    mode: typeof o.mode === "string" ? o.mode : undefined,
    styles: (o.styles as unknown) ?? undefined,
    visible: typeof o.visible === "boolean" ? o.visible : true,
    locked: typeof o.lock === "boolean" ? o.lock : false,
    zLevel: typeof o.zLevel === "number" ? o.zLevel : 0,
  };
}

/**
 * Recreate overlays from serialized data. Returns the created overlay IDs
 * so the caller can register them in the tracked set.
 */
export function restoreOverlays(
  chart: Chart | null,
  data: SerializedDrawing[],
): Array<{ id: string; meta: TrackedOverlay }> {
  if (!chart || data.length === 0) return [];

  const created: Array<{ id: string; meta: TrackedOverlay }> = [];

  for (const s of data) {
    if (!s.name) continue;
    try {
      const id = chart.createOverlay({
        name: s.name,
        mode: s.mode as never,
        points: s.points as never,
        styles: s.styles as never,
        visible: s.visible,
        lock: s.locked,
        zLevel: s.zLevel,
      } as never);
      if (typeof id === "string") {
        // Some overlay templates need explicit point override after creation.
        chart.overrideOverlay({ id, points: s.points as never });
        created.push({
          id,
          meta: {
            id,
            name: s.name,
            label: s.label || s.name,
            visible: s.visible,
            locked: s.locked,
            zLevel: s.zLevel,
            paneId: "", // Will be populated by the registry on load
          },
        });
      }
    } catch {
      // Skip overlays that fail to restore.
    }
  }

  return created;
}

/**
 * Remove all overlays in the tracked set and clear the set.
 */
export function clearOverlays(
  chart: Chart | null,
  trackedIds: Set<string>,
): void {
  if (!chart) return;
  for (const id of trackedIds) {
    try {
      chart.removeOverlay(id);
    } catch {
      // ignore
    }
  }
  trackedIds.clear();
}
