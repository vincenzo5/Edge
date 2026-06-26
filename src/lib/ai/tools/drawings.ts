import { z } from "zod";
import { defineTool } from "../types";
import type { AiTool } from "../types";
import type { ToolContext } from "../context";
import {
  DRAWING_TYPES,
  cellIndexSchema,
  drawingMetadataPatchSchema,
  drawingMetadataSchema,
  drawingPointSchema,
  drawingStylePatchSchema,
  metadataFilterSchema,
} from "../schemas";
import { baseDrawing } from "@/lib/chart/drawings/drawingUtils";
import type { DrawingStyles } from "@/lib/chart/contracts";
import {
  filterDrawingsByMetadata,
  mergeMetadata,
  normalizeMetadata,
  summarizeAnnotations,
} from "@/lib/chart/annotationMetadata";
import { getCell, requireActiveChart, requireApp } from "./_helpers";

function mapStylePatch(
  styles: z.infer<typeof drawingStylePatchSchema>,
): Partial<DrawingStyles> | undefined {
  if (!styles) return undefined;
  const mapped: Partial<DrawingStyles> = {};
  if (styles.color) mapped.lineColor = styles.color;
  if (styles.lineWidth != null) mapped.lineWidth = styles.lineWidth;
  if (styles.dash) mapped.lineDash = styles.dash;
  if (styles.fillColor) mapped.fillColor = styles.fillColor;
  if (styles.fillOpacity != null) mapped.fillOpacity = styles.fillOpacity;
  return mapped;
}

export const listDrawingsTool = defineTool({
  name: "list_drawings",
  description:
    "List serialized drawings and overlay metadata for a chart cell. Optional filters by annotation kind, status, or source.",
  inputSchema: z.object({
    cellIndex: cellIndexSchema,
    kind: metadataFilterSchema.shape.kind,
    status: metadataFilterSchema.shape.status,
    source: metadataFilterSchema.shape.source,
  }),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const { index, cell, layout } = getCell(context, input.cellIndex);
    const isActive = (layout.activeCellIndex ?? 0) === index;
    const chart = context.chart?.getActiveChart();

    const filtered = filterDrawingsByMetadata(cell.drawings, {
      kind: input.kind,
      status: input.status,
      source: input.source,
    });

    return {
      ok: true,
      data: {
        cellIndex: index,
        drawings: filtered,
        annotationSummary: summarizeAnnotations(filtered),
        overlays: isActive ? chart?.overlays ?? [] : [],
        selectedDrawingId: isActive
          ? chart?.chartCommands?.getSelectedDrawingId() ?? null
          : null,
      },
    };
  },
});

export const addDrawingTool = defineTool({
  name: "add_drawing",
  description:
    "Add a drawing to the active chart cell. Points use timestamp/value or dataIndex coordinates. Set metadata.kind and metadata.rationale for semantic annotations (thesis, invalidation, target, note). AI placements should use metadata.source: ai.",
  inputSchema: z.object({
    type: z.enum(DRAWING_TYPES),
    points: z.array(drawingPointSchema).min(1).max(4),
    label: z.string().optional(),
    styles: drawingStylePatchSchema,
    metadata: drawingMetadataSchema,
    cellIndex: cellIndexSchema,
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    requireApp(context);
    const chart = requireActiveChart(context, input.cellIndex);
    const { index, cell } = getCell(context, input.cellIndex);

    const drawingPoints = input.points.map((p) => ({
      timestamp: p.timestamp,
      value: p.value,
      dataIndex: p.dataIndex,
    }));

    const draft = baseDrawing(
      input.type,
      input.label ?? input.type,
      drawingPoints as Parameters<typeof baseDrawing>[2],
    );
    const stylePatch = mapStylePatch(input.styles);
    if (stylePatch) {
      draft.styles = { ...draft.styles, ...stylePatch };
    }
    if (input.metadata) {
      draft.metadata = normalizeMetadata(input.metadata);
    }
    draft.id = crypto.randomUUID?.() ?? `draw-${Date.now()}`;

    const nextDrawings = [...cell.drawings, draft];
    context.app.applyCellUpdate(index, { ...cell, drawings: nextDrawings });
    chart.chartCommands!.restoreDrawings(nextDrawings);

    return { ok: true, data: { cellIndex: index, drawing: draft } };
  },
});

export const updateDrawingTool = defineTool({
  name: "update_drawing",
  description:
    "Update drawing label, styles, visibility, lock state, or annotation metadata by id.",
  inputSchema: z.object({
    drawingId: z.string().min(1),
    cellIndex: cellIndexSchema,
    label: z.string().optional(),
    visible: z.boolean().optional(),
    locked: z.boolean().optional(),
    styles: drawingStylePatchSchema,
    metadata: drawingMetadataPatchSchema,
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    requireApp(context);
    const chart = requireActiveChart(context, input.cellIndex);
    const { index, cell } = getCell(context, input.cellIndex);

    let found = false;
    const drawings = cell.drawings.map((d) => {
      if (d.id !== input.drawingId) return d;
      found = true;
      const stylePatch = mapStylePatch(input.styles);
      return {
        ...d,
        label: input.label ?? d.label,
        visible: input.visible ?? d.visible,
        locked: input.locked ?? d.locked,
        styles: stylePatch ? { ...d.styles, ...stylePatch } : d.styles,
        metadata: input.metadata
          ? mergeMetadata(d.metadata, input.metadata)
          : d.metadata,
      };
    });

    if (!found) {
      return {
        ok: false,
        error: `Drawing not found: ${input.drawingId}`,
        code: "execution",
      };
    }

    context.app.applyCellUpdate(index, { ...cell, drawings });
    chart.chartCommands!.restoreDrawings(drawings);

    if (input.styles) {
      const patch = mapStylePatch(input.styles);
      if (patch) {
        chart.chartCommands!.updateDrawingStyles(input.drawingId, patch);
      }
    }

    return { ok: true, data: { cellIndex: index, drawingId: input.drawingId } };
  },
});

export const deleteDrawingTool = defineTool({
  name: "delete_drawing",
  description: "Delete a drawing by id from the active chart cell.",
  inputSchema: z.object({
    drawingId: z.string().min(1),
    cellIndex: cellIndexSchema,
  }),
  permission: "destructive",
  requiresConfirmation: true,
  requiresClientSession: true,
  async execute(input, context) {
    requireApp(context);
    const chart = requireActiveChart(context, input.cellIndex);
    const { index, cell } = getCell(context, input.cellIndex);

    const next = cell.drawings.filter((d) => d.id !== input.drawingId);
    if (next.length === cell.drawings.length) {
      return {
        ok: false,
        error: `Drawing not found: ${input.drawingId}`,
        code: "execution",
      };
    }

    context.app.applyCellUpdate(index, { ...cell, drawings: next });
    chart.chartCommands!.restoreDrawings(next);
    chart.chartCommands!.selectDrawing(null);

    return { ok: true, data: { cellIndex: index, deletedId: input.drawingId } };
  },
});

export const undoTool = defineTool({
  name: "undo",
  description: "Undo the last drawing change on the active chart.",
  inputSchema: z.object({ cellIndex: cellIndexSchema }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const chart = requireActiveChart(context, input.cellIndex);
    const didUndo = chart.chartCommands!.undo();
    return { ok: true, data: { undone: didUndo } };
  },
});

export const redoTool = defineTool({
  name: "redo",
  description: "Redo the last undone drawing change on the active chart.",
  inputSchema: z.object({ cellIndex: cellIndexSchema }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const chart = requireActiveChart(context, input.cellIndex);
    const didRedo = chart.chartCommands!.redo();
    return { ok: true, data: { redone: didRedo } };
  },
});

export const drawingTools: AiTool[] = [
  listDrawingsTool,
  addDrawingTool,
  updateDrawingTool,
  deleteDrawingTool,
  undoTool,
  redoTool,
];
