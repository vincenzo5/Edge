import {
  DrawingRegistry,
  setPendingPositionPlacementOptions,
} from "@edge/chart-core";
import { resolveDefaultPositionTargetR } from "@/lib/risk/policy/resolveDefaultPositionTargetR";
import {
  ensurePlaybookTemplatesCached,
  getCachedPlaybookTemplates,
} from "@/lib/trading/playbookTemplateCache";
import type { OrderSide } from "@/lib/trading/types";

const POSITION_TOOL_SIDES: Record<string, OrderSide> = {
  long_position: "BUY",
  short_position: "SELL",
};

function registryPositionToolName(toolName: string): string {
  return DrawingRegistry.resolveName(toolName);
}

export function isPositionDrawingTool(toolName: string): boolean {
  return registryPositionToolName(toolName) in POSITION_TOOL_SIDES;
}

function sideForPositionTool(toolName: string): OrderSide | null {
  return POSITION_TOOL_SIDES[registryPositionToolName(toolName)] ?? null;
}

/** Sync arm when template cache is warm (toolbar click). */
export function armPositionPlacementFromDefaultPolicySync(toolName: string): void {
  const side = sideForPositionTool(toolName);
  if (!side) return;
  const targetR = resolveDefaultPositionTargetR({
    side,
    templates: getCachedPlaybookTemplates(),
  });
  setPendingPositionPlacementOptions({ targetRMultiple: targetR });
}

/** Prefetch templates then arm (first placement after load). */
export async function armPositionPlacementFromDefaultPolicy(toolName: string): Promise<void> {
  const side = sideForPositionTool(toolName);
  if (!side) return;
  const templates = await ensurePlaybookTemplatesCached();
  const targetR = resolveDefaultPositionTargetR({ side, templates });
  setPendingPositionPlacementOptions({ targetRMultiple: targetR });
}
