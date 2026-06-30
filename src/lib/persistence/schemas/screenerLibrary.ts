import { z } from "zod";

import { screenQuerySchema } from "@/lib/marketData/schemas/request";
import { writeRequestBaseSchema } from "@/lib/persistence/common";
import { MAX_SAVED_SCREENS } from "@/lib/screener/screenStorage";

const screenerColumnIdSchema = z.enum([
  "symbol",
  "name",
  "price",
  "change",
  "changePercent",
  "volume",
  "sector",
  "industry",
  "country",
  "marketCap",
  "dividendYield",
  "beta",
]);

const screenerSortSchema = z
  .object({
    column: screenerColumnIdSchema,
    direction: z.enum(["asc", "desc"]),
  })
  .nullable()
  .optional();

const savedScreenSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  query: screenQuerySchema,
  columns: z.array(screenerColumnIdSchema).min(1),
  sort: screenerSortSchema,
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const screenerSnapshotSchema = z
  .object({
    version: z.literal(1),
    activeScreenId: z.string().nullable(),
    query: screenQuerySchema,
    columns: z.array(screenerColumnIdSchema).min(1),
    sort: screenerSortSchema,
    savedScreens: z.array(savedScreenSchema).max(MAX_SAVED_SCREENS),
  })
  .superRefine((value, ctx) => {
    if (
      value.activeScreenId &&
      !value.savedScreens.some((screen) => screen.id === value.activeScreenId)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "activeScreenId must reference an existing saved screen",
        path: ["activeScreenId"],
      });
    }
  });

export type ScreenerSnapshot = z.infer<typeof screenerSnapshotSchema>;

export const screenerLibraryWriteSchema = writeRequestBaseSchema.extend({
  screenerSnapshot: screenerSnapshotSchema,
});

export const screenerLibraryResponseSchema = z.object({
  schemaVersion: z.literal(1),
  syncRevision: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  screenerSnapshot: screenerSnapshotSchema,
});
