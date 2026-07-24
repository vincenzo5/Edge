import { z } from "zod";
import type { SerializedDrawing } from "@edge/chart-core/contracts";
import { isPositionDrawingName } from "@/lib/trading/positionTradeSetup";

export const RISK_POSITION_BIND_STORAGE_KEY = "edge.riskPositionBind.v1";

export const PersistedRiskPositionBindSchema = z.object({
  cellId: z.string().min(1),
  drawingId: z.string().min(1),
  linked: z.boolean(),
});

export type PersistedRiskPositionBind = z.infer<typeof PersistedRiskPositionBindSchema>;

/** Collect ids of long/short position drawings from serialized state. */
export function positionDrawingIds(drawings: SerializedDrawing[]): Set<string> {
  const ids = new Set<string>();
  for (const drawing of drawings) {
    if (!isPositionDrawingName(drawing.name)) continue;
    const id = drawing.id?.trim();
    if (id) ids.add(id);
  }
  return ids;
}

/**
 * Among newly appeared position drawings, return the last in array order
 * (append order ≈ most recently placed).
 */
export function findNewPositionDrawingId(
  prevIds: Set<string>,
  drawings: SerializedDrawing[],
): string | null {
  let newestId: string | null = null;
  for (const drawing of drawings) {
    if (!isPositionDrawingName(drawing.name)) continue;
    const id = drawing.id?.trim();
    if (!id || prevIds.has(id)) continue;
    newestId = id;
  }
  return newestId;
}

export function findPositionDrawingById(
  drawings: SerializedDrawing[],
  drawingId: string,
): SerializedDrawing | null {
  const id = drawingId.trim();
  if (!id) return null;
  for (const drawing of drawings) {
    if (drawing.id !== id || !isPositionDrawingName(drawing.name)) continue;
    return drawing;
  }
  return null;
}

export function loadRiskPositionBindFromStorage(): PersistedRiskPositionBind | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RISK_POSITION_BIND_STORAGE_KEY);
    if (raw == null) return null;
    const parsed = PersistedRiskPositionBindSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveRiskPositionBindToStorage(bind: PersistedRiskPositionBind): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RISK_POSITION_BIND_STORAGE_KEY, JSON.stringify(bind));
  } catch {
    /* quota / private mode */
  }
}

export function clearRiskPositionBindStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RISK_POSITION_BIND_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
