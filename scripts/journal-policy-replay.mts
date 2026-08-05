#!/usr/bin/env npx tsx
/**
 * Replay closed journal STK trades through risk policies (read-only).
 * Usage: npm run journal:policy-replay [-- --account U25026894] [-- --out path.json]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Pool } from "pg";

import { getChartCandlesInPeriod } from "../src/lib/yahooFinance.ts";
import {
  buildPolicyReplayPayload,
  rankScoreboard,
  replayTrade,
} from "../src/lib/journal/policyReplay/metrics.ts";
import {
  defaultPolicyReplayCanvasPath,
  renderPolicyReplayCanvas,
} from "../src/lib/journal/policyReplay/writeCanvas.ts";
import type {
  DailyBar,
  JournalTradeForReplay,
  TradeDirection,
} from "../src/lib/journal/policyReplay/types.ts";

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
    // DATABASE_URL may already be set
  }
}

type DbTradeRow = {
  id: string;
  direction: string;
  symbol: string;
  opened_at: Date;
  closed_at: Date | null;
  open_qty: number | null;
  avg_entry: number | null;
  avg_exit: number | null;
  net_pnl: number | null;
  planned_risk_usd: number | null;
};

const DEFAULT_ACCOUNT = "U25026894";
const DEFAULT_OUT = "docs/evidence/policy-replay-latest.json";

function parseArgs(): { account: string; outPath: string; canvasPath: string } {
  const argv = process.argv.slice(2);
  const accountIdx = argv.indexOf("--account");
  const outIdx = argv.indexOf("--out");
  const canvasIdx = argv.indexOf("--canvas");
  return {
    account:
      accountIdx >= 0 && argv[accountIdx + 1] ? argv[accountIdx + 1]! : DEFAULT_ACCOUNT,
    outPath: outIdx >= 0 && argv[outIdx + 1] ? argv[outIdx + 1]! : DEFAULT_OUT,
    canvasPath:
      canvasIdx >= 0 && argv[canvasIdx + 1]
        ? argv[canvasIdx + 1]!
        : defaultPolicyReplayCanvasPath(),
  };
}

async function loadClosedTrades(pool: Pool, account: string): Promise<{
  trades: JournalTradeForReplay[];
  excluded: string[];
}> {
  const result = await pool.query<DbTradeRow>(
    `
    SELECT DISTINCT ON (t.id)
      t.id,
      t.direction,
      t.symbol,
      t.opened_at,
      t.closed_at,
      open_qty.sum_qty AS open_qty,
      t.avg_entry,
      t.avg_exit,
      t.net_pnl,
      t.planned_risk_usd
    FROM journal_trades t
    INNER JOIN journal_trade_fills jtf ON jtf.trade_id = t.id
    INNER JOIN journal_fills jf ON jf.id = jtf.fill_id
    INNER JOIN LATERAL (
      SELECT COALESCE(SUM(jf2.quantity), 0) AS sum_qty
      FROM journal_trade_fills jtf2
      INNER JOIN journal_fills jf2 ON jf2.id = jtf2.fill_id
      WHERE jtf2.trade_id = t.id AND jtf2.role = 'open'
    ) open_qty ON TRUE
    WHERE t.status = 'closed'
      AND t.sec_type = 'STK'
      AND t.ignored = false
      AND t.symbol NOT LIKE '% %'
      AND open_qty.sum_qty >= 10
      AND jf.account = $1
    ORDER BY t.id, t.opened_at ASC
    `,
    [account],
  );

  const excluded: string[] = [];
  const trades: JournalTradeForReplay[] = [];

  for (const row of result.rows) {
    if (row.symbol.includes(" ")) {
      excluded.push(`${row.symbol} (multi-leg / spread symbol)`);
      continue;
    }
    if (row.closed_at == null || row.avg_entry == null || row.avg_exit == null) continue;
    if (row.net_pnl == null || row.open_qty == null) continue;

    trades.push({
      id: row.id,
      direction: row.direction as TradeDirection,
      symbol: row.symbol,
      openedAt: row.opened_at.toISOString(),
      closedAt: row.closed_at.toISOString(),
      openQty: row.open_qty,
      avgEntry: row.avg_entry,
      avgExit: row.avg_exit,
      netPnl: row.net_pnl,
      plannedRiskUsd: row.planned_risk_usd,
    });
  }

  trades.sort((a, b) => Date.parse(a.openedAt) - Date.parse(b.openedAt));
  return { trades, excluded };
}

function toDailyBars(candles: Awaited<ReturnType<typeof getChartCandlesInPeriod>>): DailyBar[] {
  return candles.map((c) => ({
    timestamp: c.timestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
}

async function main(): Promise<void> {
  loadEnvLocal();
  const { account, outPath, canvasPath } = parseArgs();

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("DATABASE_URL missing — set in .env.local");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const { trades, excluded } = await loadClosedTrades(pool, account);
    if (trades.length === 0) {
      console.error(`No closed STK trades for account ${account} (open qty >= 10, not ignored).`);
      process.exit(1);
    }

    const replayRows = [];
    for (const trade of trades) {
      const openMs = Date.parse(trade.openedAt);
      const closeMs = Date.parse(trade.closedAt);
      const candles = await getChartCandlesInPeriod(
        trade.symbol,
        new Date(openMs - 40 * 86_400_000),
        new Date(closeMs + 2 * 86_400_000),
        "1d",
      );
      if (candles.length < 15) {
        excluded.push(`${trade.symbol} (${trade.id.slice(0, 8)} — insufficient Yahoo daily bars)`);
        continue;
      }
      const row = replayTrade({ trade, bars: toDailyBars(candles) });
      if (!row) {
        excluded.push(`${trade.symbol} (${trade.id.slice(0, 8)} — could not build R path)`);
        continue;
      }
      replayRows.push(row);
      console.log(
        trade.symbol.padEnd(6),
        trade.direction.padEnd(5),
        "actual",
        String(row.results.actual.r).padStart(6),
        "step025",
        String(row.results.step_trail_025.r).padStart(6),
        "step05",
        String(row.results.step_trail_05.r).padStart(6),
      );
    }

    if (replayRows.length === 0) {
      console.error("No trades could be replayed (Yahoo paths or R unit resolution failed).");
      process.exit(1);
    }

    const payload = buildPolicyReplayPayload({ account, trades: replayRows, excluded });
    const outAbs = resolve(process.cwd(), outPath);
    mkdirSync(dirname(outAbs), { recursive: true });
    writeFileSync(outAbs, JSON.stringify(payload, null, 2));

    mkdirSync(dirname(canvasPath), { recursive: true });
    writeFileSync(canvasPath, renderPolicyReplayCanvas(payload));

    console.log(`\nPolicy replay — ${payload.tradeCount} trades (${payload.longCount}L / ${payload.shortCount}S)`);
    console.log(`Wrote ${outAbs}`);
    console.log(`Canvas ${canvasPath}`);

    console.log("\nScoreboard (all) — top policies by net R:");
    for (const row of rankScoreboard(payload.scoreboard).slice(0, 6)) {
      console.log(`  ${row.name.padEnd(28)} ${row.netR >= 0 ? "+" : ""}${row.netR.toFixed(2)}R`);
    }

    const step025 = payload.scoreboard.step_trail_025;
    console.log(
      `\nStep trail 0.25R: net ${step025.netR >= 0 ? "+" : ""}${step025.netR.toFixed(2)}R · WR ${step025.winRate}% · exp ${step025.expectancy >= 0 ? "+" : ""}${step025.expectancy.toFixed(2)}R`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
