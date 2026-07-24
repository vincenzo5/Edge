import { z } from "zod";

/**
 * Viewport persist contract — optional `CellConfig.viewport` (Phase 4).
 *
 * Write path: debounced persist only when `isViewportModified` (packages/chart-react).
 * Clear path: symbol/interval/range-preset change and Reset chart view.
 */

export const viewportPersistSketchSchema = z.object({
  startIndex: z.number().finite(),
  endIndex: z.number().finite(),
  priceMin: z.number().finite(),
  priceMax: z.number().finite(),
  priceScaleMode: z.enum(["auto", "manual"]).optional(),
});

export type ViewportPersistSketch = z.infer<typeof viewportPersistSketchSchema>;

/** Phase 4 target: optional viewport snapshot nested on CellConfig. */
export const cellViewportPersistSketchSchema = z.object({
  viewport: viewportPersistSketchSchema.optional(),
});

export type CellViewportPersistSketch = z.infer<typeof cellViewportPersistSketchSchema>;

/** Events that must clear a persisted viewport snapshot (Phase 4 guardrails). */
export const VIEWPORT_PERSIST_CLEAR_TRIGGERS = [
  "symbol_change",
  "interval_change",
  "range_preset_change",
  "reset_chart_view",
] as const;

export type ViewportPersistClearTrigger = (typeof VIEWPORT_PERSIST_CLEAR_TRIGGERS)[number];

export function parseViewportPersistSketch(raw: unknown): ViewportPersistSketch | null {
  const result = viewportPersistSketchSchema.safeParse(raw);
  return result.success ? result.data : null;
}
