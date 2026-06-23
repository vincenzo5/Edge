import { z } from "zod";

import {
  MAX_WATCHLIST_ITEMS,
  MAX_WATCHLISTS,
} from "@/lib/watchlist/storage";
import { writeRequestBaseSchema } from "@/lib/persistence/common";

const watchlistItemSchema = z.object({
  symbol: z.string().trim().min(1).max(16),
  name: z.string().optional(),
  exchange: z.string().optional(),
  addedAt: z.number().int().nonnegative(),
  color: z.string().optional(),
});

const watchlistSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  items: z.array(watchlistItemSchema).max(MAX_WATCHLIST_ITEMS),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const watchlistSnapshotSchema = z
  .object({
    version: z.literal(1),
    activeWatchlistId: z.string().min(1),
    selectedSymbol: z.string().nullable(),
    watchlists: z.array(watchlistSchema).min(1).max(MAX_WATCHLISTS),
  })
  .superRefine((value, ctx) => {
    const active = value.watchlists.find((w) => w.id === value.activeWatchlistId);
    if (!active) {
      ctx.addIssue({
        code: "custom",
        message: "activeWatchlistId must reference an existing watchlist",
        path: ["activeWatchlistId"],
      });
    }
    if (
      value.selectedSymbol &&
      !value.watchlists.some((w) => w.items.some((i) => i.symbol === value.selectedSymbol))
    ) {
      ctx.addIssue({
        code: "custom",
        message: "selectedSymbol must exist in a watchlist item",
        path: ["selectedSymbol"],
      });
    }
  });

export type WatchlistSnapshot = z.infer<typeof watchlistSnapshotSchema>;

export const watchlistLibraryWriteSchema = writeRequestBaseSchema.extend({
  watchlistSnapshot: watchlistSnapshotSchema,
});

export const watchlistLibraryResponseSchema = z.object({
  schemaVersion: z.literal(1),
  syncRevision: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  watchlistSnapshot: watchlistSnapshotSchema,
});
