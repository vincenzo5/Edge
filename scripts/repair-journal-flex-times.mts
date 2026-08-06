#!/usr/bin/env npx tsx
/**
 * Repair Flex CSV fill times stored as Eastern-wall-as-UTC, rebuild trades,
 * and recompute planned risk from initial_stop where present.
 *
 * Usage:
 *   npm run journal:repair-flex-times -- --database postgres://tvai:tvai@localhost:5432/edge_prod
 *   npm run journal:repair-flex-times -- --database ... --account U25026894 --apply --all-flex
 *
 * Default is dry-run. --apply writes. --all-flex repairs every flex_csv row for the
 * user (recommended for the UTC-container one-shot); otherwise the ET-hour-band
 * heuristic is used. State file prevents double-shift on re-run.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

import { Pool } from "pg";

import { planFlexFillTimeRepair } from "../src/lib/journal/flexImport/repairFlexFillTimes.ts";
import {
  buildTradeIdRemap,
  remapAttachmentTradeId,
} from "../src/lib/journal/preserveTradeAttachments.ts";
import { rebuildTrades } from "../src/lib/journal/rebuildTrades.ts";
import { applyInitialStopPlannedRisk } from "../src/lib/journal/tradeRiskGeometry.ts";
import type { JournalFill, JournalTrade } from "../src/lib/journal/types.ts";

function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

type Args = {
  database: string;
  account: string;
  apply: boolean;
  allFlex: boolean;
  statePath: string;
  evidencePath: string;
};

const DEFAULT_ACCOUNT = "U25026894";
const DEFAULT_STATE = "docs/evidence/journal-flex-time-repair-state.json";
const DEFAULT_EVIDENCE = "docs/evidence/journal-flex-time-repair-2026-08-06.txt";

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    return idx >= 0 && argv[idx + 1] ? argv[idx + 1] : undefined;
  };
  return {
    database:
      get("--database") ??
      process.env.DATABASE_URL ??
      "postgres://tvai:tvai@localhost:5432/edge_prod",
    account: get("--account") ?? DEFAULT_ACCOUNT,
    apply: argv.includes("--apply"),
    allFlex: argv.includes("--all-flex"),
    statePath: get("--state") ?? DEFAULT_STATE,
    evidencePath: get("--evidence") ?? DEFAULT_EVIDENCE,
  };
}

type RepairState = {
  repairedAt: string;
  database: string;
  account: string;
  execIds: string[];
  repairs: Array<{ execId: string; fromIso: string; toIso: string }>;
};

function loadState(path: string): RepairState | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as RepairState;
  } catch {
    return null;
  }
}

async function resolveUserId(pool: Pool, account: string): Promise<string | null> {
  const byFill = await pool.query<{ user_id: string }>(
    `select user_id from journal_fills where account = $1 limit 1`,
    [account],
  );
  return byFill.rows[0]?.user_id ?? null;
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
    `select id, exec_id, account, fill_time, side, quantity, price, avg_price,
            order_id, perm_id, order_ref, exchange, contract, commission,
            commission_currency, realized_pnl, source, created_at
     from journal_fills where user_id = $1 order by fill_time`,
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

async function loadPreviousTrades(pool: Pool, userId: string): Promise<JournalTrade[]> {
  const trades = await pool.query<{
    id: string;
    status: JournalTrade["status"];
    direction: JournalTrade["direction"];
    symbol: string;
    sec_type: string;
    opened_at: Date;
    closed_at: Date | null;
    net_quantity: number | null;
    avg_entry: number | null;
    avg_exit: number | null;
    gross_pnl: number | null;
    net_pnl: number | null;
    total_commission: number | null;
    legs: JournalTrade["legs"];
    tags: string[] | null;
    setup: string | null;
    review_note: string | null;
    planned_risk_mode: JournalTrade["plannedRiskMode"];
    planned_risk_value: number | null;
    planned_risk_usd: number | null;
    initial_stop: number | null;
    rating: JournalTrade["rating"];
    ignored: boolean | null;
    mfe_usd: number | null;
    mfa_usd: number | null;
    excursion_interval: JournalTrade["excursionInterval"];
    excursion_computed_at: Date | null;
    manage_playbook: JournalTrade["managePlaybook"];
  }>(`select * from journal_trades where user_id = $1`, [userId]);

  const result: JournalTrade[] = [];
  for (const row of trades.rows) {
    const links = await pool.query<{ exec_id: string; role: "open" | "close" }>(
      `select f.exec_id, tf.role
       from journal_trade_fills tf
       join journal_fills f on f.id = tf.fill_id
       where tf.trade_id = $1`,
      [row.id],
    );
    result.push({
      id: row.id,
      status: row.status,
      direction: row.direction,
      symbol: row.symbol,
      secType: row.sec_type,
      openedAt: row.opened_at.toISOString(),
      closedAt: row.closed_at?.toISOString() ?? null,
      netQuantity: row.net_quantity,
      avgEntry: row.avg_entry,
      avgExit: row.avg_exit,
      grossPnL: row.gross_pnl,
      netPnL: row.net_pnl,
      totalCommission: row.total_commission,
      legs: row.legs ?? undefined,
      fillExecIds: links.rows.map((link) => link.exec_id),
      fillLinks: links.rows.map((link) => ({ execId: link.exec_id, role: link.role })),
      tags: row.tags ?? undefined,
      setup: row.setup,
      reviewNote: row.review_note,
      plannedRiskMode: row.planned_risk_mode,
      plannedRiskValue: row.planned_risk_value,
      plannedRiskUsd: row.planned_risk_usd,
      initialStop: row.initial_stop,
      rating: row.rating,
      ignored: row.ignored ?? false,
      mfeUsd: row.mfe_usd,
      mfaUsd: row.mfa_usd,
      excursionInterval: row.excursion_interval,
      excursionComputedAt: row.excursion_computed_at?.toISOString() ?? null,
      managePlaybook: row.manage_playbook,
    });
  }
  return result;
}

async function rebuildAndPersist(pool: Pool, userId: string): Promise<number> {
  const fills = await loadFills(pool, userId);
  const previous = await loadPreviousTrades(pool, userId);
  const { trades } = rebuildTrades(fills, previous);
  const tradeIdRemap = buildTradeIdRemap(previous, trades);

  const screenshots = await pool.query(`select * from journal_trade_screenshots where user_id = $1`, [
    userId,
  ]);
  const chartSnapshots = await pool.query(
    `select * from journal_trade_chart_snapshots where user_id = $1`,
    [userId],
  );

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
        planned_risk_usd, initial_stop, rating, ignored, mfe_usd, mfa_usd,
        excursion_interval, excursion_computed_at, manage_playbook, created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,$14,
        $15::jsonb,$16::jsonb,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,
        $27,$28,$29::jsonb,now(),now()
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
        trade.avgEntry ?? null,
        trade.avgExit ?? null,
        trade.grossPnL ?? null,
        trade.netPnL ?? null,
        trade.totalCommission ?? null,
        trade.legs ? JSON.stringify(trade.legs) : null,
        JSON.stringify(trade.tags ?? []),
        trade.setup ?? null,
        trade.reviewNote ?? null,
        trade.plannedRiskMode ?? null,
        trade.plannedRiskValue ?? null,
        trade.plannedRiskUsd ?? null,
        trade.initialStop ?? null,
        trade.rating ?? null,
        trade.ignored ?? false,
        trade.mfeUsd ?? null,
        trade.mfaUsd ?? null,
        trade.excursionInterval ?? null,
        trade.excursionComputedAt ?? null,
        trade.managePlaybook ? JSON.stringify(trade.managePlaybook) : null,
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

  for (const shot of screenshots.rows as Array<Record<string, unknown>>) {
    const nextTradeId = remapAttachmentTradeId(String(shot.trade_id), tradeIdRemap);
    if (!nextTradeId) continue;
    await pool.query(
      `insert into journal_trade_screenshots (
        id, user_id, trade_id, sort_index, caption, mime_type, byte_size, storage_key,
        width, height, source, created_at, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        shot.id ?? randomUUID(),
        userId,
        nextTradeId,
        shot.sort_index ?? 0,
        shot.caption ?? null,
        shot.mime_type,
        shot.byte_size,
        shot.storage_key,
        shot.width ?? null,
        shot.height ?? null,
        shot.source ?? "upload",
        shot.created_at ?? new Date(),
        shot.updated_at ?? new Date(),
      ],
    );
  }

  for (const snap of chartSnapshots.rows as Array<Record<string, unknown>>) {
    const nextTradeId = remapAttachmentTradeId(String(snap.trade_id), tradeIdRemap);
    if (!nextTradeId) continue;
    await pool.query(
      `insert into journal_trade_chart_snapshots (
        id, user_id, trade_id, sort_index, label, symbol, interval,
        cell_config, cell_config_original, plan_levels, screenshot_id,
        created_at, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13)`,
      [
        snap.id ?? randomUUID(),
        userId,
        nextTradeId,
        snap.sort_index ?? 0,
        snap.label ?? null,
        snap.symbol,
        snap.interval,
        JSON.stringify(snap.cell_config ?? {}),
        JSON.stringify(snap.cell_config_original ?? {}),
        snap.plan_levels == null ? null : JSON.stringify(snap.plan_levels),
        snap.screenshot_id ?? null,
        snap.created_at ?? new Date(),
        snap.updated_at ?? new Date(),
      ],
    );
  }

  return trades.length;
}

async function main(): Promise<void> {
  loadEnvLocal();
  const args = parseArgs();
  process.env.DATABASE_URL = args.database;

  const pool = new Pool({ connectionString: args.database });
  const state = loadState(resolve(process.cwd(), args.statePath));
  const already = new Set(state?.execIds ?? []);

  try {
    const userId = await resolveUserId(pool, args.account);
    if (!userId) {
      throw new Error(`No journal user found for account ${args.account}`);
    }

    const fillRows = await pool.query<{
      exec_id: string;
      fill_time: Date;
      source: string;
    }>(
      `select exec_id, fill_time, source from journal_fills where user_id = $1 order by fill_time`,
      [userId],
    );

    const plans = planFlexFillTimeRepair(
      fillRows.rows.map((row) => ({
        execId: row.exec_id,
        fillTime: row.fill_time.toISOString(),
        source: row.source,
      })),
      { allFlex: args.allFlex, alreadyRepairedExecIds: already },
    );

    console.log(
      `user=${userId} account=${args.account} flexCandidates=${plans.length} mode=${args.allFlex ? "all-flex" : "heuristic"} apply=${args.apply}`,
    );
    for (const plan of plans.slice(0, 10)) {
      console.log(`  ${plan.execId}: ${plan.fromIso} → ${plan.toIso} (${plan.reason})`);
    }
    if (plans.length > 10) console.log(`  … +${plans.length - 10} more`);

    if (args.apply && plans.length > 0) {
      for (const plan of plans) {
        await pool.query(
          `update journal_fills set fill_time = $1::timestamptz
           where user_id = $2 and exec_id = $3 and source = 'flex_csv'`,
          [plan.toIso, userId, plan.execId],
        );
      }
    }

    let tradesRebuilt = 0;
    let recomputed = 0;
    let missingStopLqda = 0;
    if (args.apply) {
      tradesRebuilt = await rebuildAndPersist(pool, userId);
      console.log(`rebuilt trades=${tradesRebuilt}`);

      const trades = await pool.query<{
        id: string;
        direction: "long" | "short";
        avg_entry: number | null;
        net_quantity: number | null;
        initial_stop: number | null;
        symbol: string;
      }>(
        `select id, direction, avg_entry, net_quantity, initial_stop, symbol
         from journal_trades where user_id = $1`,
        [userId],
      );

      for (const trade of trades.rows) {
        if (trade.initial_stop == null || trade.avg_entry == null) {
          if (trade.symbol === "LQDA") missingStopLqda += 1;
          continue;
        }
        try {
          const applied = applyInitialStopPlannedRisk(
            {
              direction: trade.direction,
              avgEntry: trade.avg_entry,
              netQuantity: trade.net_quantity,
            },
            trade.initial_stop,
          );
          await pool.query(
            `update journal_trades set
              planned_risk_mode = $3,
              planned_risk_value = $4,
              planned_risk_usd = $5,
              updated_at = now()
             where id = $1 and user_id = $2`,
            [
              trade.id,
              userId,
              applied.plannedRiskMode,
              applied.plannedRiskValue,
              applied.plannedRiskUsd,
            ],
          );
          recomputed += 1;
        } catch (err) {
          console.warn(`skip risk recompute ${trade.symbol} ${trade.id}:`, err);
        }
      }
      console.log(`planned_risk recomputed=${recomputed} lqda_missing_stop=${missingStopLqda}`);
    }

    const lqda = await pool.query<{
      id: string;
      net_quantity: number | null;
      avg_entry: number | null;
      avg_exit: number | null;
      net_pnl: number | null;
      planned_risk_usd: number | null;
      initial_stop: number | null;
      opened_at: Date;
      closed_at: Date | null;
      status: string;
    }>(
      `select id, net_quantity, avg_entry, avg_exit, net_pnl, planned_risk_usd, initial_stop,
              opened_at, closed_at, status
       from journal_trades
       where user_id = $1 and symbol = 'LQDA'
       order by opened_at desc
       limit 1`,
      [userId],
    );

    const lqdaFills = lqda.rows[0]
      ? await pool.query<{
          exec_id: string;
          fill_time: Date;
          side: string;
          quantity: number;
          source: string;
        }>(
          `select f.exec_id, f.fill_time, f.side, f.quantity, f.source
           from journal_fills f
           join journal_trade_fills tf on tf.fill_id = f.id
           where f.user_id = $1 and tf.trade_id = $2
           order by f.fill_time`,
          [userId, lqda.rows[0].id],
        )
      : { rows: [] };

    const evidenceLines = [
      "# Journal Flex time + qty repair evidence",
      `generated_at: ${new Date().toISOString()}`,
      `database: ${args.database.replace(/:[^:@/]+@/, ":***@")}`,
      `account: ${args.account}`,
      `user_id: ${userId}`,
      `apply: ${args.apply}`,
      `mode: ${args.allFlex ? "all-flex" : "heuristic_et_hour_band"}`,
      `fill_time_repairs_planned: ${plans.length}`,
      `trades_rebuilt: ${args.apply ? tradesRebuilt : 0}`,
      `planned_risk_recomputed: ${args.apply ? recomputed : 0}`,
      "",
      "## Heuristic",
      "- Only source=flex_csv (never live).",
      "- Default: America/New_York hour of stored instant in [4,8] and repaired ET hour in [8,17].",
      "- --all-flex: reinterpret UTC clock digits as Eastern for every flex_csv row; state file blocks re-run.",
      "- Reinterpret: UTC y-m-d h:mi:s components → America/New_York wall → real UTC ISO.",
      "",
      "## Sample repairs",
      ...plans.slice(0, 20).map((p) => `${p.execId}: ${p.fromIso} -> ${p.toIso}`),
      "",
      "## LQDA after run",
      lqda.rows[0]
        ? [
            `trade_id: ${lqda.rows[0].id}`,
            `status: ${lqda.rows[0].status}`,
            `net_quantity: ${lqda.rows[0].net_quantity}`,
            `avg_entry: ${lqda.rows[0].avg_entry}`,
            `avg_exit: ${lqda.rows[0].avg_exit}`,
            `net_pnl: ${lqda.rows[0].net_pnl}`,
            `planned_risk_usd: ${lqda.rows[0].planned_risk_usd}`,
            `initial_stop: ${lqda.rows[0].initial_stop}`,
            `opened_at: ${lqda.rows[0].opened_at.toISOString()}`,
            `closed_at: ${lqda.rows[0].closed_at?.toISOString() ?? "null"}`,
            `r_multiple: ${
              lqda.rows[0].planned_risk_usd && lqda.rows[0].net_pnl != null
                ? (lqda.rows[0].net_pnl / lqda.rows[0].planned_risk_usd).toFixed(4)
                : "n/a"
            }`,
            "",
            "fills:",
            ...lqdaFills.rows.map(
              (f) =>
                `  ${f.fill_time.toISOString()} ${f.side} ${f.quantity} ${f.source} ${f.exec_id}`,
            ),
          ].join("\n")
        : "LQDA trade not found",
      "",
      "## Manual follow-up",
      "- If LQDA initial_stop is null, re-save stop at 77.57 in the UI (or patch) so planned_risk recomputes to ~$2400 / ~1.0R.",
      "- Review notes/tags are preserved across rebuild.",
    ];

    const evidencePath = resolve(process.cwd(), args.evidencePath);
    mkdirSync(dirname(evidencePath), { recursive: true });
    writeFileSync(evidencePath, evidenceLines.join("\n") + "\n", "utf8");
    console.log(`evidence: ${evidencePath}`);

    if (args.apply && plans.length > 0) {
      const nextState: RepairState = {
        repairedAt: new Date().toISOString(),
        database: args.database.replace(/:[^:@/]+@/, ":***@"),
        account: args.account,
        execIds: [...already, ...plans.map((p) => p.execId)],
        repairs: [
          ...(state?.repairs ?? []),
          ...plans.map((p) => ({
            execId: p.execId,
            fromIso: p.fromIso,
            toIso: p.toIso,
          })),
        ],
      };
      const statePath = resolve(process.cwd(), args.statePath);
      mkdirSync(dirname(statePath), { recursive: true });
      writeFileSync(statePath, JSON.stringify(nextState, null, 2) + "\n", "utf8");
      console.log(`state: ${statePath}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
