#!/usr/bin/env npx tsx
/**
 * Seed isolated demo journal history for dashboard visualization.
 * Usage: npm run journal:seed-demo [-- --reset] [-- --synthetic]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

import { Pool } from "pg";

import { buildDemoJournalFills } from "../src/lib/journal/demoSeed/buildDemoJournalFills.ts";
import {
  defaultDemoEndDate,
  fetchDemoPriceBook,
} from "../src/lib/journal/demoSeed/demoMarketPrices.ts";
import {
  DEMO_FILL_EXEC_ID_PREFIX,
  DEMO_JOURNAL_ACCOUNT_ID,
  DEMO_JOURNAL_USER_EMAIL,
  resolveDemoJournalAccountId,
} from "../src/lib/journal/demoSeed/demoSeedConstants.ts";
import { rebuildTrades } from "../src/lib/journal/rebuildTrades.ts";
import type { JournalFill, JournalTrade } from "../src/lib/journal/types.ts";

/** Round USD / price fields to cents before persist. */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundMoneyOrNull(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return roundMoney(value);
}

function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = value;
    }
  } catch {
    // DATABASE_URL may already be set
  }
}

function parseArgs(): { reset: boolean; synthetic: boolean } {
  return {
    reset: process.argv.includes("--reset"),
    synthetic: process.argv.includes("--synthetic"),
  };
}

async function findOrCreateDemoUser(pool: Pool): Promise<string> {
  const existing = await pool.query<{ id: string }>(
    `select id from app_users where email = $1 limit 1`,
    [DEMO_JOURNAL_USER_EMAIL],
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const userId = randomUUID();
  await pool.query(
    `insert into app_users (id, email, display_name) values ($1, $2, $3)`,
    [userId, DEMO_JOURNAL_USER_EMAIL, "Demo Trader"],
  );
  return userId;
}

async function clearJournalForUser(pool: Pool, userId: string): Promise<void> {
  await pool.query(
    `delete from journal_trade_fills where trade_id in (select id from journal_trades where user_id = $1)`,
    [userId],
  );
  await pool.query(`delete from journal_trades where user_id = $1`, [userId]);
  await pool.query(`delete from journal_fills where user_id = $1`, [userId]);
}

async function upsertFills(
  pool: Pool,
  userId: string,
  fills: ReturnType<typeof buildDemoJournalFills>["fills"],
): Promise<{ imported: number; duplicates: number }> {
  const existing = await pool.query<{ exec_id: string }>(
    `select exec_id from journal_fills where user_id = $1`,
    [userId],
  );
  const existingExecIds = new Set(existing.rows.map((row) => row.exec_id));
  let imported = 0;

  for (const fill of fills) {
    if (!existingExecIds.has(fill.execId)) imported += 1;
    await pool.query(
      `insert into journal_fills (
        id, user_id, exec_id, account, fill_time, side, quantity, price,
        avg_price, order_id, perm_id, order_ref, exchange, contract,
        commission, commission_currency, realized_pnl, source, created_at
      ) values (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13::jsonb,
        $14, $15, $16, $17, now()
      )
      on conflict (user_id, exec_id) do update set
        account = excluded.account,
        fill_time = excluded.fill_time,
        side = excluded.side,
        quantity = excluded.quantity,
        price = excluded.price,
        avg_price = excluded.avg_price,
        order_id = excluded.order_id,
        perm_id = excluded.perm_id,
        order_ref = excluded.order_ref,
        exchange = excluded.exchange,
        contract = excluded.contract,
        commission = excluded.commission,
        commission_currency = excluded.commission_currency,
        realized_pnl = excluded.realized_pnl,
        source = excluded.source`,
      [
        userId,
        fill.execId,
        fill.account ?? null,
        fill.fillTime,
        fill.side,
        fill.quantity,
        roundMoney(fill.price),
        roundMoneyOrNull(fill.avgPrice ?? fill.price),
        fill.orderId ?? null,
        fill.permId ?? null,
        fill.orderRef ?? null,
        fill.exchange ?? null,
        JSON.stringify(fill.contract),
        roundMoneyOrNull(fill.commission),
        fill.commissionCurrency ?? null,
        roundMoneyOrNull(fill.realizedPNL),
        fill.source,
      ],
    );
  }

  return { imported, duplicates: fills.length - imported };
}

async function loadFills(pool: Pool, userId: string): Promise<JournalFill[]> {
  const result = await pool.query<{
    id: string;
    exec_id: string;
    account: string | null;
    fill_time: Date;
    side: string;
    quantity: number;
    price: number;
    avg_price: number | null;
    order_id: number | null;
    perm_id: number | null;
    order_ref: string | null;
    exchange: string | null;
    contract: JournalFill["contract"];
    commission: number | null;
    commission_currency: string | null;
    realized_pnl: number | null;
    source: JournalFill["source"];
    created_at: Date;
  }>(
    `select * from journal_fills where user_id = $1 order by fill_time asc`,
    [userId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    execId: row.exec_id,
    account: row.account,
    fillTime: row.fill_time.toISOString(),
    side: row.side,
    quantity: row.quantity,
    price: row.price,
    avgPrice: row.avg_price,
    orderId: row.order_id,
    permId: row.perm_id,
    orderRef: row.order_ref,
    exchange: row.exchange,
    contract: row.contract,
    commission: row.commission,
    commissionCurrency: row.commission_currency,
    realizedPNL: row.realized_pnl,
    source: row.source,
    createdAt: row.created_at.toISOString(),
  }));
}

async function rebuildAndPersistTrades(pool: Pool, userId: string): Promise<number> {
  const fills = (await loadFills(pool, userId)).filter((fill) =>
    fill.execId.startsWith(DEMO_FILL_EXEC_ID_PREFIX),
  );
  const { trades } = rebuildTrades(fills, [] as JournalTrade[]);

  await pool.query(
    `delete from journal_trade_fills where trade_id in (select id from journal_trades where user_id = $1)`,
    [userId],
  );
  await pool.query(`delete from journal_trades where user_id = $1`, [userId]);

  for (const trade of trades) {
    await pool.query(
      `insert into journal_trades (
        id, user_id, status, direction, symbol, sec_type, opened_at, closed_at,
        net_quantity, avg_entry, avg_exit, gross_pnl, net_pnl, total_commission,
        legs, tags, setup, review_note, planned_risk_mode, planned_risk_value,
        planned_risk_usd, rating, ignored, created_at, updated_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15::jsonb, $16::jsonb, $17, $18, $19, $20,
        $21, $22, $23, now(), now()
      )`,
      [
        trade.id,
        userId,
        trade.status,
        trade.direction,
        trade.symbol,
        trade.secType,
        trade.openedAt,
        trade.closedAt ?? null,
        trade.netQuantity ?? null,
        roundMoneyOrNull(trade.avgEntry),
        roundMoneyOrNull(trade.avgExit),
        roundMoneyOrNull(trade.grossPnL),
        roundMoneyOrNull(trade.netPnL),
        roundMoneyOrNull(trade.totalCommission),
        trade.legs ? JSON.stringify(trade.legs) : null,
        JSON.stringify(trade.tags ?? []),
        trade.setup ?? null,
        trade.reviewNote ?? null,
        trade.plannedRiskMode ?? null,
        roundMoneyOrNull(trade.plannedRiskValue),
        roundMoneyOrNull(trade.plannedRiskUsd),
        trade.rating ?? null,
        trade.ignored ?? false,
      ],
    );

    for (const execId of trade.fillExecIds) {
      const fillRow = await pool.query<{ id: string }>(
        `select id from journal_fills where user_id = $1 and exec_id = $2 limit 1`,
        [userId, execId],
      );
      const fillId = fillRow.rows[0]?.id;
      if (!fillId) continue;
      const role =
        trade.fillLinks?.find((link) => link.execId === execId)?.role ?? "open";
      await pool.query(
        `insert into journal_trade_fills (trade_id, fill_id, role) values ($1, $2, $3)`,
        [trade.id, fillId, role],
      );
    }
  }

  return trades.length;
}

async function patchDemoTradeMetadata(
  pool: Pool,
  userId: string,
  tradeId: string,
  meta: {
    setup: string;
    tags: string[];
    initialStop: number;
    plannedRiskValue: number;
    rating: number;
    reviewNote: string;
    ignored: boolean;
    mfeUsd: number | null;
    mfaUsd: number | null;
    excursionInterval: "1m" | "5m" | null;
    excursionComputedAt: string | null;
    managePlaybook: unknown | null;
  },
): Promise<void> {
  const instanceId =
    meta.managePlaybook &&
    typeof meta.managePlaybook === "object" &&
    meta.managePlaybook !== null &&
    "instanceId" in meta.managePlaybook &&
    typeof (meta.managePlaybook as { instanceId?: unknown }).instanceId === "string"
      ? (meta.managePlaybook as { instanceId: string }).instanceId
      : null;

  await pool.query(
    `update journal_trades set
      setup = $3,
      tags = $4::jsonb,
      initial_stop = $5,
      planned_risk_mode = 'usd',
      planned_risk_value = $6,
      planned_risk_usd = $6,
      rating = $7,
      review_note = $8,
      ignored = $9,
      mfe_usd = $10,
      mfa_usd = $11,
      excursion_interval = $12,
      excursion_computed_at = $13,
      manage_playbook = $14::jsonb,
      risk_policy_instance_id = $15::uuid,
      updated_at = now()
    where id = $1 and user_id = $2`,
    [
      tradeId,
      userId,
      meta.setup,
      JSON.stringify(meta.tags),
      roundMoney(meta.initialStop),
      roundMoney(meta.plannedRiskValue),
      meta.rating,
      meta.reviewNote,
      meta.ignored,
      roundMoneyOrNull(meta.mfeUsd),
      roundMoneyOrNull(meta.mfaUsd),
      meta.excursionInterval,
      meta.excursionComputedAt,
      meta.managePlaybook ? JSON.stringify(meta.managePlaybook) : null,
      instanceId,
    ],
  );
}

async function listTradesWithExecIds(
  pool: Pool,
  userId: string,
): Promise<Array<{ id: string; status: string; fillExecIds: string[] }>> {
  const trades = await pool.query<{ id: string; status: string }>(
    `select id, status from journal_trades where user_id = $1 order by opened_at desc`,
    [userId],
  );
  const result: Array<{ id: string; status: string; fillExecIds: string[] }> = [];
  for (const trade of trades.rows) {
    const links = await pool.query<{ exec_id: string }>(
      `select f.exec_id
       from journal_trade_fills jtf
       join journal_fills f on f.id = jtf.fill_id
       where jtf.trade_id = $1`,
      [trade.id],
    );
    result.push({
      id: trade.id,
      status: trade.status,
      fillExecIds: links.rows.map((row) => row.exec_id),
    });
  }
  return result;
}

async function main(): Promise<void> {
  loadEnvLocal();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("journal:seed-demo requires DATABASE_URL (Postgres). Run npm run dev first.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const { reset, synthetic } = parseArgs();
    const userId = await findOrCreateDemoUser(pool);
    const accountId = resolveDemoJournalAccountId();

    if (reset) {
      await clearJournalForUser(pool, userId);
      console.log(`Cleared journal data for ${DEMO_JOURNAL_USER_EMAIL}`);
    }

    const endDate = defaultDemoEndDate();
    let priceBook: Awaited<ReturnType<typeof fetchDemoPriceBook>> | undefined;
    if (!synthetic) {
      console.log(`Fetching market daily bars through ${endDate.toISOString().slice(0, 10)}…`);
      priceBook = await fetchDemoPriceBook({ endDate });
      const sample = priceBook.get("AAPL")?.size ?? 0;
      if (sample === 0) {
        throw new Error(
          "No Yahoo daily bars returned. Retry later or run with --synthetic for placeholder prices.",
        );
      }
      console.log(`  loaded daily bars for ${priceBook.size} symbols (${sample} AAPL sessions)`);
    }

    const { fills, tradeMetadataByEntryExecId } = buildDemoJournalFills({
      endDate,
      priceBook,
    });
    const upsert = await upsertFills(pool, userId, fills);
    const tradesRebuilt = await rebuildAndPersistTrades(pool, userId);

    let patched = 0;
    const trades = await listTradesWithExecIds(pool, userId);
    for (const trade of trades) {
      const entryExecId = trade.fillExecIds.find((execId) =>
        tradeMetadataByEntryExecId.has(execId),
      );
      if (!entryExecId) continue;
      const meta = tradeMetadataByEntryExecId.get(entryExecId);
      if (!meta) continue;

      await patchDemoTradeMetadata(pool, userId, trade.id, {
        setup: meta.setup,
        tags: meta.tags,
        initialStop: meta.initialStop,
        plannedRiskValue: meta.plannedRiskValue,
        rating: meta.rating,
        reviewNote: meta.reviewNote,
        ignored: meta.ignored,
        mfeUsd: meta.mfeUsd,
        mfaUsd: meta.mfaUsd,
        excursionInterval: meta.excursionInterval,
        excursionComputedAt: meta.excursionComputedAt,
        managePlaybook: meta.managePlaybook,
      });
      patched += 1;
    }

    const closed = trades.filter((t) => t.status === "closed").length;
    const open = trades.filter((t) => t.status === "open").length;

    console.log(`Demo journal seed — ${DEMO_JOURNAL_USER_EMAIL}`);
    console.log(`  account: ${accountId}`);
    console.log(`  fills imported: ${upsert.imported} (duplicates: ${upsert.duplicates})`);
    console.log(`  trades rebuilt: ${tradesRebuilt} (${closed} closed, ${open} open)`);
    console.log(`  metadata patched: ${patched}`);
    console.log("");
    console.log("Switch to demo user:");
    console.log(`  1. Set EDGE_DEV_USER_EMAIL=${DEMO_JOURNAL_USER_EMAIL} in .env.local`);
    console.log(`  2. Set EDGE_DEMO_JOURNAL_ACCOUNT_ID=${DEMO_JOURNAL_ACCOUNT_ID} in .env.local`);
    console.log("  3. Clear session: curl -X DELETE http://localhost:3003/api/auth/dev-session");
    console.log("  4. Reload app and select Demo in the account picker");
    console.log("  5. Open /journal/dashboard");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
