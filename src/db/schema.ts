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

export const userAppWorkspaces = pgTable("user_app_workspaces", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  schemaVersion: integer("schema_version").notNull().default(1),
  appWorkspacesSnapshot: jsonb("app_workspaces_snapshot").notNull(),
  syncRevision: integer("sync_revision").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  schemaVersion: integer("schema_version").notNull().default(1),
  preferencesSnapshot: jsonb("preferences_snapshot").notNull(),
  syncRevision: integer("sync_revision").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userPatternTaxonomy = pgTable("user_pattern_taxonomy", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  schemaVersion: integer("schema_version").notNull().default(1),
  taxonomy: jsonb("taxonomy").notNull(),
  syncRevision: integer("sync_revision").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userPatternRecords = pgTable(
  "user_pattern_records",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    recordId: text("record_id").notNull(),
    record: jsonb("record").notNull(),
    symbol: text("symbol").notNull(),
    setupFamilyId: text("setup_family_id").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.recordId] })],
);

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

export const userScripts = pgTable(
  "user_scripts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    scriptId: uuid("script_id").notNull(),
    displayName: text("display_name").notNull(),
    headRevision: text("head_revision"),
    draftSource: text("draft_source"),
    draftManifest: jsonb("draft_manifest"),
    draftDirty: boolean("draft_dirty").notNull().default(false),
    draftUpdatedAt: timestamp("draft_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.scriptId] })],
);

export const userScriptRevisions = pgTable(
  "user_script_revisions",
  {
    userId: uuid("user_id").notNull(),
    scriptId: uuid("script_id").notNull(),
    revision: text("revision").notNull(),
    source: text("source").notNull(),
    languageVersion: text("language_version").notNull(),
    sdkVersion: text("sdk_version").notNull(),
    manifest: jsonb("manifest"),
    artifactHash: text("artifact_hash"),
    compileOk: boolean("compile_ok").notNull(),
    compiledAt: timestamp("compiled_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.scriptId, table.revision] }),
  ],
);

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
  initialStop: doublePrecision("initial_stop"),
  rating: integer("rating"),
  mfeUsd: doublePrecision("mfe_usd"),
  mfaUsd: doublePrecision("mfa_usd"),
  excursionInterval: text("excursion_interval"),
  excursionComputedAt: timestamp("excursion_computed_at", { withTimezone: true }),
  ignored: boolean("ignored").notNull().default(false),
  managePlaybook: jsonb("manage_playbook"),
  riskPolicyInstanceId: uuid("risk_policy_instance_id"),
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

export const journalTradeScreenshots = pgTable(
  "journal_trade_screenshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    tradeId: uuid("trade_id")
      .notNull()
      .references(() => journalTrades.id, { onDelete: "cascade" }),
    sortIndex: integer("sort_index").notNull().default(0),
    caption: text("caption"),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    storageKey: text("storage_key").notNull(),
    width: integer("width"),
    height: integer("height"),
    source: text("source").notNull().default("upload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("journal_trade_screenshots_trade_sort_unique").on(
      table.tradeId,
      table.sortIndex,
    ),
  ],
);

export const copilotAttachments = pgTable("copilot_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  storageKey: text("storage_key").notNull(),
  name: text("name"),
  source: text("source").notNull().default("upload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const journalTradeChartSnapshots = pgTable(
  "journal_trade_chart_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    tradeId: uuid("trade_id")
      .notNull()
      .references(() => journalTrades.id, { onDelete: "cascade" }),
    sortIndex: integer("sort_index").notNull().default(0),
    label: text("label"),
    symbol: text("symbol").notNull(),
    interval: text("interval").notNull(),
    cellConfig: jsonb("cell_config").notNull(),
    cellConfigOriginal: jsonb("cell_config_original").notNull(),
    planLevels: jsonb("plan_levels"),
    screenshotId: uuid("screenshot_id").references(() => journalTradeScreenshots.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("journal_trade_chart_snapshots_trade_sort_unique").on(
      table.tradeId,
      table.sortIndex,
    ),
  ],
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

export const playbookInstances = pgTable("playbook_instances", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  templateId: text("template_id").notNull(),
  templateSnapshot: jsonb("template_snapshot"),
  status: text("status").notNull(),
  positionPlan: jsonb("position_plan").notNull(),
  ruleRuntimes: jsonb("rule_runtimes").notNull(),
  environment: text("environment"),
  accountId: text("account_id"),
  symbol: text("symbol"),
  side: text("side"),
  bindingRefKind: text("binding_ref_kind"),
  bindingRefId: text("binding_ref_id"),
  controlMode: text("control_mode"),
  offReason: text("off_reason"),
  protect: jsonb("protect").notNull().default([]),
  protectState: text("protect_state").notNull().default("unknown"),
  protectCheckedAt: timestamp("protect_checked_at", { withTimezone: true }),
  entrySchedule: jsonb("entry_schedule"),
  entryOrder: jsonb("entry_order"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  armedAt: timestamp("armed_at", { withTimezone: true }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  detachedAt: timestamp("detached_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  orderIntentId: uuid("order_intent_id"),
  orderRef: text("order_ref"),
  stopOrderId: integer("stop_order_id"),
  filledQty: integer("filled_qty"),
  takeProfitOrderId: integer("take_profit_order_id"),
  manageState: jsonb("manage_state"),
  alertBundleId: uuid("alert_bundle_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const playbookTemplates = pgTable(
  "playbook_templates",
  {
    id: text("id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    rules: jsonb("rules").notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    scope: text("scope").notNull().default("trade"),
    budget: jsonb("budget"),
    sizing: jsonb("sizing"),
    geometry: jsonb("geometry"),
    exits: jsonb("exits"),
    gates: jsonb("gates"),
    defaultEntrySchedule: jsonb("default_entry_schedule"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.id] })],
);

export const playbookAutoManage = pgTable("playbook_auto_manage", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  paperEnabled: boolean("paper_enabled").notNull().default(true),
  liveEnabled: boolean("live_enabled").notNull().default(false),
  liveConsentAt: timestamp("live_consent_at", { withTimezone: true }),
  paperKillActive: boolean("paper_kill_active").notNull().default(false),
  liveKillActive: boolean("live_kill_active").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const brokerIngestCursors = pgTable("broker_ingest_cursors", {
  userId: uuid("user_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  connectionId: text("connection_id").notNull(),
  accountId: text("account_id"),
  lastExecTime: timestamp("last_exec_time", { withTimezone: true }),
  lastSeenExecIds: jsonb("last_seen_exec_ids").notNull().default([]),
  lastIngestAt: timestamp("last_ingest_at", { withTimezone: true }),
  lastIngestError: text("last_ingest_error"),
  lastFlexBackfillAt: timestamp("last_flex_backfill_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.connectionId] }),
]);

export const accountSnapshots = pgTable(
  "account_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    connectionId: text("connection_id").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    netLiquidation: doublePrecision("net_liquidation"),
    cash: doublePrecision("cash"),
    buyingPower: doublePrecision("buying_power"),
    grossPositionValue: doublePrecision("gross_position_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("account_snapshots_user_account_conn_captured_unique").on(
      table.userId,
      table.accountId,
      table.connectionId,
      table.capturedAt,
    ),
  ],
);

export const positionSnapshots = pgTable(
  "position_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    connectionId: text("connection_id").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    positions: jsonb("positions").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("position_snapshots_user_account_conn_captured_unique").on(
      table.userId,
      table.accountId,
      table.connectionId,
      table.capturedAt,
    ),
  ],
);

export type AppUser = typeof appUsers.$inferSelect;
export type ChartWorkspace = typeof chartWorkspaces.$inferSelect;
export type UserWatchlistLibrary = typeof userWatchlistLibrary.$inferSelect;
export type UserScreenerLibrary = typeof userScreenerLibrary.$inferSelect;
export type UserAppWorkspaces = typeof userAppWorkspaces.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type UserPatternTaxonomy = typeof userPatternTaxonomy.$inferSelect;
export type UserPatternRecord = typeof userPatternRecords.$inferSelect;
export type ChartTemplateLibrary = typeof chartTemplateLibrary.$inferSelect;
export type UserScript = typeof userScripts.$inferSelect;
export type UserScriptRevision = typeof userScriptRevisions.$inferSelect;
export type MarketResearchNote = typeof marketResearchNotes.$inferSelect;
export type JournalFill = typeof journalFills.$inferSelect;
export type JournalTrade = typeof journalTrades.$inferSelect;
export type JournalTradeFill = typeof journalTradeFills.$inferSelect;
export type JournalTradeScreenshot = typeof journalTradeScreenshots.$inferSelect;
export type CopilotAttachment = typeof copilotAttachments.$inferSelect;
export type JournalTradeChartSnapshot = typeof journalTradeChartSnapshots.$inferSelect;
export type OrderIntentRow = typeof orderIntents.$inferSelect;
export type PlaybookInstanceRow = typeof playbookInstances.$inferSelect;
export type PlaybookTemplateRow = typeof playbookTemplates.$inferSelect;
export type PlaybookAutoManageRow = typeof playbookAutoManage.$inferSelect;
export type BrokerIngestCursor = typeof brokerIngestCursors.$inferSelect;
export type AccountSnapshotRow = typeof accountSnapshots.$inferSelect;
export type PositionSnapshotRow = typeof positionSnapshots.$inferSelect;

export const notificationEvents = pgTable(
  "notification_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    dedupeKey: text("dedupe_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("notification_events_id_user_unique").on(table.id, table.userId),
  ],
);

export const alertDefinitions = pgTable("alert_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  operator: text("operator").notNull(),
  price: doublePrecision("price").notNull(),
  message: text("message"),
  recurrence: text("recurrence").notNull().default("once"),
  status: text("status").notNull().default("active"),
  cooldownMs: integer("cooldown_ms").notNull().default(30_000),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  lastPrice: doublePrecision("last_price"),
  lastFiredAt: timestamp("last_fired_at", { withTimezone: true }),
  drawingId: text("drawing_id"),
  drawingKind: text("drawing_kind"),
  priceHigh: doublePrecision("price_high"),
  tlT0: doublePrecision("tl_t0"),
  tlV0: doublePrecision("tl_v0"),
  tlT1: doublePrecision("tl_t1"),
  tlV1: doublePrecision("tl_v1"),
  tlExtendLeft: boolean("tl_extend_left"),
  tlExtendRight: boolean("tl_extend_right"),
  drawingRole: text("drawing_role"),
  bundleId: uuid("bundle_id"),
  combinator: text("combinator"),
  conditions: jsonb("conditions").notNull().default([]),
  watchlistId: text("watchlist_id"),
  symbolState: jsonb("symbol_state").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const screenerAlerts = pgTable(
  "screener_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    screenId: text("screen_id").notNull(),
    intervalMinutes: integer("interval_minutes").notNull().default(60),
    notifyOn: text("notify_on").notNull().default("added"),
    status: text("status").notNull().default("active"),
    cooldownMs: integer("cooldown_ms").notNull().default(300_000),
    lastSymbols: jsonb("last_symbols").notNull().default([]),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    lastFiredAt: timestamp("last_fired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("screener_alerts_user_screen_unique").on(table.userId, table.screenId),
  ],
);

export const alertTriggerEvents = pgTable("alert_trigger_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  alertId: uuid("alert_id")
    .notNull()
    .references(() => alertDefinitions.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  operator: text("operator").notNull(),
  triggerPrice: doublePrecision("trigger_price").notNull(),
  quotePrice: doublePrecision("quote_price").notNull(),
  notificationId: uuid("notification_id").references(() => notificationEvents.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tradingAuditEvents = pgTable("trading_audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  atMs: bigint("at_ms", { mode: "number" }).notNull(),
  action: text("action").notNull(),
  outcome: text("outcome").notNull(),
  intentId: text("intent_id"),
  orderRef: text("order_ref"),
  requestId: text("request_id"),
  detail: text("detail"),
});

export const productionErrorEvents = pgTable("production_error_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  atMs: bigint("at_ms", { mode: "number" }).notNull(),
  source: text("source").notNull(),
  message: text("message").notNull(),
  stack: text("stack"),
  detail: text("detail"),
  requestId: text("request_id"),
});

export const userCopilotThreads = pgTable("user_copilot_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New chat"),
  schemaVersion: integer("schema_version").notNull().default(1),
  messages: jsonb("messages").notNull().default([]),
  modelId: text("model_id"),
  syncRevision: integer("sync_revision").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

export const userResearchSessions = pgTable("user_research_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Research session"),
  schemaVersion: integer("schema_version").notNull().default(1),
  question: text("question"),
  cards: jsonb("cards").notNull().default([]),
  links: jsonb("links").notNull().default([]),
  threadIds: jsonb("thread_ids").notNull().default([]),
  reel: jsonb("reel").notNull().default([]),
  syncRevision: integer("sync_revision").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

export const connections = pgTable(
  "connections",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    kind: text("kind").notNull(),
    authKind: text("auth_kind").notNull(),
    broker: text("broker").notNull(),
    environment: text("environment").notNull(),
    displayName: text("display_name").notNull(),
    status: text("status").notNull().default("unknown"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.id] })],
);

export type NotificationEventRow = typeof notificationEvents.$inferSelect;
export type AlertDefinitionRow = typeof alertDefinitions.$inferSelect;
export type AlertTriggerEventRow = typeof alertTriggerEvents.$inferSelect;
export type TradingAuditEventRow = typeof tradingAuditEvents.$inferSelect;
export type ProductionErrorEventRow = typeof productionErrorEvents.$inferSelect;
export type ScreenerAlertRow = typeof screenerAlerts.$inferSelect;
