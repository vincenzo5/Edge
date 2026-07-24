import { z } from "zod";

import { appWorkspacesStateSchema } from "@/lib/appWorkspace/schema";
import { writeRequestBaseSchema } from "@/lib/persistence/common";

export const appWorkspacesSnapshotSchema = appWorkspacesStateSchema;

export type AppWorkspacesSnapshot = z.infer<typeof appWorkspacesSnapshotSchema>;

export const appWorkspacesLibraryWriteSchema = writeRequestBaseSchema.extend({
  appWorkspacesSnapshot: appWorkspacesSnapshotSchema,
});

export const appWorkspacesLibraryResponseSchema = z.object({
  schemaVersion: z.literal(1),
  syncRevision: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  appWorkspacesSnapshot: appWorkspacesSnapshotSchema,
});
