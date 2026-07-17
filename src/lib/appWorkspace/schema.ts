import { z } from "zod";

export const surfaceIdSchema = z.enum(["chart", "screener", "journal", "placeholder"]);

export const tileSurfaceStateSchema = z.object({
  screenerView: z.enum(["review", "screens", "results", "keepers"]).optional(),
  journalView: z.enum(["dashboard", "trades", "settings"]).optional(),
});

export const tileInstanceSchema = z.object({
  id: z.string().min(1),
  surfaceId: surfaceIdSchema,
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
