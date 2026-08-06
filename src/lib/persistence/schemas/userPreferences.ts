import { z } from "zod";

import { DataProviderPreferenceSchema } from "@/lib/connections/types";
import { THEMES } from "@/lib/chartConfig";
import { DEFAULT_PALETTE, PALETTES } from "@/lib/design-system/palettes";
import { RiskSettingsSchema } from "@/lib/risk/riskSettings";
import {
  JOURNAL_TRADES_PAGE_SIZE_OPTIONS,
  type JournalTradesTableColumnId,
  type JournalTradesTableSortKey,
} from "@/lib/journal/journalTradesTableControls";
import {
  DEFAULT_JOURNAL_CAPITAL_EVENTS,
  journalCapitalEventsSchema,
} from "@/lib/journal/journalCapitalPreference";
import {
  DEFAULT_JOURNAL_SETUP_VALUES,
  journalSetupValuesSchema,
} from "@/lib/journal/journalSetupPreference";
import { TradingEnvironmentSchema, TradingAccountSchema } from "@/lib/trading/types";
import { SCHEMA_VERSION } from "@/lib/persistence/common";

const journalTradesTableColumnIdSchema = z.enum([
  "openDate",
  "symbol",
  "status",
  "closeDate",
  "entry",
  "exit",
  "r",
  "setup",
  "tags",
  "chart",
  "netPnL",
  "direction",
  "secType",
  "activity",
]) satisfies z.ZodType<JournalTradesTableColumnId>;

const journalTradesTableSortKeySchema = z.enum([
  "openDate",
  "closeDate",
  "symbol",
  "status",
  "entry",
  "exit",
  "r",
  "netPnL",
  "activity",
]) satisfies z.ZodType<JournalTradesTableSortKey>;

export const journalTradesTablePrefsSchema = z.object({
  visibleColumns: z.array(journalTradesTableColumnIdSchema).min(1),
  columnOrder: z.array(journalTradesTableColumnIdSchema).min(1),
  pageSize: z.union(
    JOURNAL_TRADES_PAGE_SIZE_OPTIONS.map((size) => z.literal(size)) as [
      z.ZodLiteral<(typeof JOURNAL_TRADES_PAGE_SIZE_OPTIONS)[number]>,
      ...z.ZodLiteral<(typeof JOURNAL_TRADES_PAGE_SIZE_OPTIONS)[number]>[],
    ],
  ),
});

export const userPreferencesSnapshotSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  theme: z.enum(THEMES),
  palette: z.enum(PALETTES).default(DEFAULT_PALETTE),
  timeZone: z.string().min(1),
  dataConnectionId: z.string().min(1).nullable(), // Deprecated: always ib-live; kept for pack compatibility
  dataConnectionExplicit: z.boolean(), // Deprecated: always false
  dataProviderPreference: DataProviderPreferenceSchema,
  tradingEnvironment: TradingEnvironmentSchema,
  activeAccount: TradingAccountSchema.nullable(),
  accountAliases: z.record(z.string(), z.string()),
  riskSettings: RiskSettingsSchema,
  journalTradesTablePrefs: journalTradesTablePrefsSchema,
  journalSetupValues: journalSetupValuesSchema.default([...DEFAULT_JOURNAL_SETUP_VALUES]),
  journalCapitalEvents: journalCapitalEventsSchema.default([...DEFAULT_JOURNAL_CAPITAL_EVENTS]),
});

export type UserPreferencesSnapshot = z.infer<typeof userPreferencesSnapshotSchema>;

/** Local migration source keys — pack reads/writes these as cache. */
export const USER_PREFERENCES_LOCAL_SOURCE_KEYS = {
  theme: "edge:app:theme:v1",
  palette: "edge:app:palette:v1",
  timeZone: "edge:app:timeZone:v1",
  dataConnectionId: "edge:marketData:connectionId",
  dataConnectionExplicit: "edge:marketData:connectionId:explicit",
  dataProviderPreference: "edge:marketData:providerPreference:v1",
  tradingEnvironment: "edge:trading:environment",
  activeAccount: "edge:trading:activeAccount",
  accountAliases: "edge:trading:accountAliases.v1",
  riskSettings: "edge.riskSettings.v1",
  journalTradesTablePrefs: "edge.journal.tradesTable.v1",
  journalSetupValues: "edge.journal.setupValues.v1",
  journalCapitalEvents: "edge.journal.capitalEvents.v1",
} as const;

export const userPreferencesLibraryWriteSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  baseRevision: z.number().int().nonnegative(),
  preferencesSnapshot: userPreferencesSnapshotSchema,
});

export const userPreferencesLibraryResponseSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  syncRevision: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  preferencesSnapshot: userPreferencesSnapshotSchema,
});

export function parseUserPreferencesSnapshot(raw: unknown): UserPreferencesSnapshot | null {
  const result = userPreferencesSnapshotSchema.safeParse(raw);
  return result.success ? result.data : null;
}
