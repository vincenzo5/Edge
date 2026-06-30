import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const appUsers = pgTable("app_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chartWorkspaces = pgTable(
  "chart_workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    workspaceName: text("workspace_name").notNull().default("Default"),
    schemaVersion: integer("schema_version").notNull().default(1),
    chartLayoutSnapshot: jsonb("chart_layout_snapshot").notNull(),
    syncRevision: integer("sync_revision").notNull().default(1),
    isDefault: boolean("is_default").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("chart_workspaces_user_default_unique")
      .on(table.userId)
      .where(sql`${table.isDefault} = true AND ${table.archivedAt} IS NULL`),
  ],
);

export const userWatchlistLibrary = pgTable("user_watchlist_library", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  schemaVersion: integer("schema_version").notNull().default(1),
  watchlistSnapshot: jsonb("watchlist_snapshot").notNull(),
  syncRevision: integer("sync_revision").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userScreenerLibrary = pgTable("user_screener_library", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  schemaVersion: integer("schema_version").notNull().default(1),
  screenerSnapshot: jsonb("screener_snapshot").notNull(),
  syncRevision: integer("sync_revision").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chartTemplateLibrary = pgTable("chart_template_library", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  schemaVersion: integer("schema_version").notNull().default(1),
  templateSnapshot: jsonb("template_snapshot").notNull(),
  syncRevision: integer("sync_revision").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const marketResearchNotes = pgTable("market_research_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  chartWorkspaceId: uuid("chart_workspace_id").references(() => chartWorkspaces.id, {
    onDelete: "set null",
  }),
  symbol: text("symbol").notNull(),
  chartInterval: text("chart_interval").notNull(),
  researchNoteType: text("research_note_type").notNull(),
  chartDrawingSnapshot: jsonb("chart_drawing_snapshot"),
  researchThesis: jsonb("research_thesis").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

export type AppUser = typeof appUsers.$inferSelect;
export type ChartWorkspace = typeof chartWorkspaces.$inferSelect;
export type UserWatchlistLibrary = typeof userWatchlistLibrary.$inferSelect;
export type UserScreenerLibrary = typeof userScreenerLibrary.$inferSelect;
export type ChartTemplateLibrary = typeof chartTemplateLibrary.$inferSelect;
export type MarketResearchNote = typeof marketResearchNotes.$inferSelect;
