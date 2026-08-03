import { z } from "zod";

import { ALERT_DRAWING_KINDS, ALERT_OPERATORS } from "@/lib/persistence/schemas/alerts";

export const surfaceIdSchema = z.enum([
  "chart",
  "screener",
  "journal",
  "scripts",
  "alerts",
  "copilot",
  "expectancy",
  "placeholder",
]);

const expectancySurfaceParamsSchema = z.object({
  presetId: z.string().optional(),
  startingEquity: z.number().finite().positive(),
  years: z.number().finite().positive(),
  winRate: z.number().finite().min(0).max(1),
  avgWinR: z.number().finite().positive(),
  avgLossR: z.number().finite().positive(),
  riskFraction: z.number().finite().positive().max(1),
  tradesPerWeek: z.number().finite().positive(),
  monteCarloRuns: z.number().finite().int().min(100).max(5000).optional(),
  monteCarloSeed: z.number().finite().int().optional(),
});

export const tileSurfaceStateSchema = z.object({
  screenerView: z.enum(["review", "screens", "results", "keepers"]).optional(),
  journalView: z.enum(["dashboard", "trades", "open", "settings"]).optional(),
  selectedScriptId: z.string().min(1).optional(),
  selectedAlertId: z.string().min(1).optional(),
  alertPrefill: z
    .object({
      symbol: z.string().min(1),
      operator: z.enum(ALERT_OPERATORS),
      price: z.number().finite(),
      message: z.string().optional(),
      drawingId: z.string().min(1).optional(),
      drawingKind: z.enum(ALERT_DRAWING_KINDS).optional(),
      priceHigh: z.number().finite().optional(),
      tlT0: z.number().finite().optional(),
      tlV0: z.number().finite().optional(),
      tlT1: z.number().finite().optional(),
      tlV1: z.number().finite().optional(),
      tlExtendLeft: z.boolean().optional(),
      tlExtendRight: z.boolean().optional(),
    })
    .optional(),
  expectancyMode: z.enum(["deterministic", "monteCarlo"]).optional(),
  expectancyParams: expectancySurfaceParamsSchema.optional(),
});

export const tileInstanceSchema = z.object({
  id: z.string().min(1),
  surfaceId: surfaceIdSchema,
  chartWorkspaceId: z.string().uuid().optional(),
  surfaceState: tileSurfaceStateSchema.optional(),
});

export const tileNodeSchema = z.object({
  type: z.literal("tile"),
  id: z.string().min(1),
  tileId: z.string().min(1),
});

export const splitNodeSchema: z.ZodType<{
  type: "split";
  id: string;
  direction: "row" | "column";
  children: [unknown, unknown];
  sizes: [number, number];
}> = z.lazy(() =>
  z.object({
    type: z.literal("split"),
    id: z.string().min(1),
    direction: z.enum(["row", "column"]),
    children: z.tuple([layoutNodeSchema, layoutNodeSchema]),
    sizes: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
  }),
);

export const layoutNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([tileNodeSchema, splitNodeSchema]),
);

export const appWorkspaceDocumentSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  root: layoutNodeSchema,
  tiles: z.record(z.string(), tileInstanceSchema),
  activeTileId: z.string().optional(),
  updatedAt: z.string(),
});

export const appWorkspacesStateSchema = z.object({
  version: z.literal(1),
  activeDocumentId: z.string().min(1),
  documents: z.array(appWorkspaceDocumentSchema).min(1),
});

export type ParsedAppWorkspacesState = z.infer<typeof appWorkspacesStateSchema>;

export function parseAppWorkspacesState(raw: unknown): ParsedAppWorkspacesState | null {
  const result = appWorkspacesStateSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function parseAppWorkspaceDocument(raw: unknown): z.infer<typeof appWorkspaceDocumentSchema> | null {
  const result = appWorkspaceDocumentSchema.safeParse(raw);
  return result.success ? result.data : null;
}
