import { z } from "zod";
import { defineTool } from "../types";
import type { AiTool } from "../types";
import type { ToolContext } from "../context";
import {
  IMPLEMENTED_INDICATORS,
  cellIndexSchema,
} from "../schemas";
import {
  createIndicatorInstance,
  type IndicatorConfig,
} from "@/lib/chartConfig";
import { getCatalogMeta } from "@/lib/chart/indicators/registry";
import { getCell, requireApp } from "./_helpers";

export const listIndicatorsTool = defineTool({
  name: "list_indicators",
  description:
    "List indicators on a chart cell, plus the catalog of AI-supported implemented indicators.",
  inputSchema: z.object({ cellIndex: cellIndexSchema }),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const { index, cell } = getCell(context, input.cellIndex);
    return {
      ok: true,
      data: {
        cellIndex: index,
        active: cell.indicators,
        supported: [...IMPLEMENTED_INDICATORS],
      },
    };
  },
});

export const addIndicatorTool = defineTool({
  name: "add_indicator",
  description:
    "Add an implemented indicator (MA, EMA, BOLL, MACD, RSI, VOL) to a chart cell.",
  inputSchema: z.object({
    name: z.enum(IMPLEMENTED_INDICATORS),
    cellIndex: cellIndexSchema,
    pane: z.enum(["main", "sub"]).optional(),
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    requireApp(context);
    const { index, cell } = getCell(context, input.cellIndex);
    const meta = getCatalogMeta(input.name);
    const pane = input.pane ?? meta?.defaultPane ?? "main";
    const instance = createIndicatorInstance(input.name, pane);
    context.app.applyCellUpdate(index, {
      ...cell,
      indicators: [...cell.indicators, instance],
    });
    return { ok: true, data: { cellIndex: index, indicator: instance } };
  },
});

export const removeIndicatorTool = defineTool({
  name: "remove_indicator",
  description: "Remove an indicator from a chart cell by its id.",
  inputSchema: z.object({
    indicatorId: z.string().min(1),
    cellIndex: cellIndexSchema,
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    requireApp(context);
    const { index, cell } = getCell(context, input.cellIndex);
    const next = cell.indicators.filter((i) => i.id !== input.indicatorId);
    if (next.length === cell.indicators.length) {
      return {
        ok: false,
        error: `Indicator not found: ${input.indicatorId}`,
        code: "execution",
      };
    }
    context.app.applyCellUpdate(index, { ...cell, indicators: next });
    return { ok: true, data: { cellIndex: index, removedId: input.indicatorId } };
  },
});

export const updateIndicatorTool = defineTool({
  name: "update_indicator",
  description: "Update indicator visibility, inputs, or styles by id.",
  inputSchema: z.object({
    indicatorId: z.string().min(1),
    cellIndex: cellIndexSchema,
    visible: z.boolean().optional(),
    inputs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    styles: z
      .record(
        z.string(),
        z.object({
          color: z.string().optional(),
          lineWidth: z.number().optional(),
          visible: z.boolean().optional(),
        }),
      )
      .optional(),
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    requireApp(context);
    const { index, cell } = getCell(context, input.cellIndex);
    let found = false;
    const indicators = cell.indicators.map((ind) => {
      if (ind.id !== input.indicatorId) return ind;
      found = true;
      return {
        ...ind,
        visible: input.visible ?? ind.visible,
        inputs: input.inputs
          ? ({ ...ind.inputs, ...input.inputs } as IndicatorConfig["inputs"])
          : ind.inputs,
        styles: input.styles
          ? ({ ...ind.styles, ...input.styles } as IndicatorConfig["styles"])
          : ind.styles,
      };
    });
    if (!found) {
      return {
        ok: false,
        error: `Indicator not found: ${input.indicatorId}`,
        code: "execution",
      };
    }
    context.app.applyCellUpdate(index, { ...cell, indicators });
    return { ok: true, data: { cellIndex: index, indicatorId: input.indicatorId } };
  },
});

export const indicatorTools: AiTool[] = [
  listIndicatorsTool,
  addIndicatorTool,
  removeIndicatorTool,
  updateIndicatorTool,
];
