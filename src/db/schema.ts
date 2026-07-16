import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  primaryKey,
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

export const journalFills = pgTable(
  "journal_fills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    execId: text("exec_id").notNull(),
    account: text("account"),
    fillTime: timestamp("fill_time", { withTimezone: true }).notNull(),
    side: text("side").notNull(),
    quantity: doublePrecision("quantity").notNull(),
    price: doublePrecision("price").notNull(),
    avgPrice: doublePrecision("avg_price"),
    orderId: bigint("order_id", { mode: "number" }),
    permId: bigint("perm_id", { mode: "number" }),
    orderRef: text("order_ref"),
    exchange: text("exchange"),
    contract: jsonb("contract").notNull(),
    commission: doublePrecision("commission"),
    commissionCurrency: text("commission_currency"),
    realizedPnl: doublePrecision("realized_pnl"),
    source: text("source").notNull().default("live"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("journal_fills_user_exec_unique").on(table.userId, table.execId),
  ],
);

export const journalTrades = pgTable("journal_trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  direction: text("direction").notNull(),
  symbol: text("symbol").notNull(),
  secType: text("sec_type").notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  netQuantity: doublePrecision("net_quantity"),
  avgEntry: doublePrecision("avg_entry"),
  avgExit: doublePrecision("avg_exit"),
  grossPnl: doublePrecision("gross_pnl"),
  netPnl: doublePrecision("net_pnl"),
  totalCommission: doublePrecision("total_commission"),
  legs: jsonb("legs"),
  tags: jsonb("tags").notNull().default([]),
  setup: text("setup"),
  reviewNote: text("review_note"),
  plannedRiskMode: text("planned_risk_mode"),
  plannedRiskValue: doublePrecision("planned_risk_value"),
  plannedRiskUsd: doublePrecision("planned_risk_usd"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const journalTradeFills = pgTable(
  "journal_trade_fills",
  {
    tradeId: uuid("trade_id")
      .notNull()
      .references(() => journalTrades.id, { onDelete: "cascade" }),
    fillId: uuid("fill_id")
      .notNull()
      .references(() => journalFills.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
  },
  (table) => [primaryKey({ columns: [table.tradeId, table.fillId] })],
);

export const orderIntents = pgTable(
  "order_intents",
  {
    intentId: uuid("intent_id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    draftHash: text("draft_hash").notNull(),
    draft: jsonb("draft").notNull(),
    status: text("status").notNull(),
    orderRef: text("order_ref").notNull(),
    permId: bigint("perm_id", { mode: "number" }),
    orderId: bigint("order_id", { mode: "number" }),
    createdAtMs: bigint("created_at_ms", { mode: "number" }).notNull(),
    updatedAtMs: bigint("updated_at_ms", { mode: "number" }).notNull(),
  },
  (table) => [
    uniqueIndex("order_intents_user_idempotency_unique").on(
      table.userId,
      table.idempotencyKey,
    ),
  ],
);

export type AppUser = typeof appUsers.$inferSelect;
export type ChartWorkspace = typeof chartWorkspaces.$inferSelect;
export type UserWatchlistLibrary = typeof userWatchlistLibrary.$inferSelect;
export type UserScreenerLibrary = typeof userScreenerLibrary.$inferSelect;
export type ChartTemplateLibrary = typeof chartTemplateLibrary.$inferSelect;
export type MarketResearchNote = typeof marketResearchNotes.$inferSelect;
export type JournalFill = typeof journalFills.$inferSelect;
export type JournalTrade = typeof journalTrades.$inferSelect;
export type JournalTradeFill = typeof journalTradeFills.$inferSelect;
export type OrderIntentRow = typeof orderIntents.$inferSelect;
