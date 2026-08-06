import type {
  JournalFillInput,
  ManagePlaybookJournal,
} from "@/lib/persistence/schemas/journal";
import {
  lookupDemoBar,
  priceFromDailyBar,
  type DemoPriceBook,
} from "@/lib/journal/demoSeed/demoMarketPrices";
import {
  DEMO_FILL_EXEC_ID_PREFIX,
  DEMO_JOURNAL_ACCOUNT_ID,
  DEMO_JOURNAL_SYMBOLS,
} from "@/lib/journal/demoSeed/demoSeedConstants";
import { DEFAULT_JOURNAL_SETUP_VALUES } from "@/lib/journal/journalSetupPreference";
import {
  PLAYBOOK_PRESET_IDS,
  PLAYBOOK_PRESETS,
  type PlaybookPresetId,
} from "@/lib/trading/playbook/presets";

const SYMBOLS = DEMO_JOURNAL_SYMBOLS;

const TAG_POOL = [
  "planned",
  "fomo",
  "revenge",
  "discipline",
  "earnings-play",
  "A+",
  "scratch",
  "news",
] as const;

const REVIEW_NOTE_POOL = [
  "Waited for the level; execution matched the plan.",
  "Entered early — next time wait for confirmation candle.",
  "Scaled correctly; trail protected the runner.",
  "Size felt heavy after the open; cut risk next session.",
  "Clean pullback entry; held through the first shakeout.",
  "FOMO add after green — stick to one risk unit.",
  "Stopped out at plan; no chase. Reset and wait.",
  "Earnings catalyst paid; journal the gap fill next time.",
  "Good R multiple; exit was a bit early vs strength.",
  "News spike — scratch was the right call.",
] as const;

/** Metadata applied after trade rebuild, keyed by entry exec id. */
export type DemoTradeMetadata = {
  entryExecId: string;
  setup: string;
  tags: string[];
  plannedRiskMode: "usd";
  plannedRiskValue: number;
  initialStop: number;
  direction: "long" | "short";
  rating: number;
  reviewNote: string;
  ignored: boolean;
  mfeUsd: number | null;
  mfaUsd: number | null;
  excursionInterval: "1m" | "5m" | null;
  excursionComputedAt: string | null;
  managePlaybook: ManagePlaybookJournal | null;
};

export type DemoJournalSeedBundle = {
  fills: JournalFillInput[];
  tradeMetadataByEntryExecId: Map<string, DemoTradeMetadata>;
};

/** Deterministic pseudo-random in [0, 1). */
function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function pick<T>(items: readonly T[], seed: string): T {
  const idx = Math.floor(hash01(seed) * items.length);
  return items[Math.min(idx, items.length - 1)]!;
}

/** Round USD / price fields to cents for clean journal UI. */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Deterministic UUID v4-shaped id from a seed string (DB uuid columns). */
export function demoUuidFromSeed(seed: string): string {
  const bytes: number[] = [];
  let h = 2166136261;
  for (let i = 0; i < 16; i += 1) {
    h ^= seed.charCodeAt(i % seed.length) + i * 17;
    h = Math.imul(h, 16777619);
    bytes.push((h >>> 0) & 0xff);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function isoAt(day: Date, hour: number, minute: number): string {
  const d = new Date(day);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

function addWeekdays(start: Date, weekdayCount: number): Date[] {
  const days: Date[] = [];
  const cursor = new Date(start);
  while (days.length < weekdayCount) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      days.push(new Date(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function buildFill(input: {
  execId: string;
  fillTime: string;
  side: "BOT" | "SLD";
  quantity: number;
  price: number;
  symbol: string;
  conId: number;
  commission: number;
  realizedPNL: number | null;
  orderId: number;
  orderRef?: string | null;
}): JournalFillInput {
  const price = roundMoney(input.price);
  return {
    execId: input.execId,
    account: DEMO_JOURNAL_ACCOUNT_ID,
    fillTime: input.fillTime,
    side: input.side,
    quantity: input.quantity,
    price,
    avgPrice: price,
    contract: {
      conId: input.conId,
      symbol: input.symbol,
      secType: "STK",
    },
    commission: roundMoney(input.commission),
    commissionCurrency: "USD",
    realizedPNL: input.realizedPNL == null ? null : roundMoney(input.realizedPNL),
    orderId: input.orderId,
    orderRef: input.orderRef ?? null,
    exchange: "SMART",
    source: "flex_csv",
  };
}

function syntheticEntryPrice(sym: (typeof SYMBOLS)[number], seedKey: string): number {
  const entryJitter = (hash01(`${seedKey}-ej`) - 0.5) * 4;
  return roundMoney(sym.basePrice + entryJitter);
}

function resolveTradePrices(input: {
  seedKey: string;
  sym: (typeof SYMBOLS)[number];
  day: Date;
  isLong: boolean;
  isWin: boolean;
  priceBook?: DemoPriceBook;
}): { entryPrice: number; exitPrice: number; initialStop: number } | null {
  const direction = input.isLong ? "long" : "short";
  const bar = input.priceBook ? lookupDemoBar(input.priceBook, input.sym.symbol, input.day) : null;

  if (bar) {
    const entryPrice = priceFromDailyBar(bar, `${input.seedKey}-entry`, "entry", direction, input.isWin);
    const exitPrice = priceFromDailyBar(bar, `${input.seedKey}-exit`, "exit", direction, input.isWin);
    const riskPct = 0.012 + hash01(`${input.seedKey}-risk`) * 0.012;
    const stopDistance = entryPrice * riskPct;
    const initialStop = roundMoney(
      input.isLong ? entryPrice - stopDistance : entryPrice + stopDistance,
    );
    return { entryPrice, exitPrice, initialStop };
  }

  if (input.priceBook) {
    return null;
  }

  const entryPrice = syntheticEntryPrice(input.sym, input.seedKey);
  const riskPct = 0.015 + hash01(`${input.seedKey}-risk`) * 0.01;
  const stopDistance = entryPrice * riskPct;
  const initialStop = roundMoney(
    input.isLong ? entryPrice - stopDistance : entryPrice + stopDistance,
  );
  const rMultiple = input.isWin
    ? 0.8 + hash01(`${input.seedKey}-r`) * 2.2
    : -(0.5 + hash01(`${input.seedKey}-lr`) * 1.2);
  const exitMove = stopDistance * rMultiple;
  const exitPrice = roundMoney(input.isLong ? entryPrice + exitMove : entryPrice - exitMove);
  return { entryPrice, exitPrice, initialStop };
}

function buildExcursion(input: {
  seedKey: string;
  isClosed: boolean;
  isWin: boolean;
  plannedRiskValue: number;
  grossPnl: number;
  closedAt: string | null;
}): Pick<
  DemoTradeMetadata,
  "mfeUsd" | "mfaUsd" | "excursionInterval" | "excursionComputedAt"
> {
  if (!input.isClosed || input.closedAt == null) {
    return {
      mfeUsd: null,
      mfaUsd: null,
      excursionInterval: null,
      excursionComputedAt: null,
    };
  }

  const risk = Math.max(input.plannedRiskValue, 1);
  const absPnl = Math.abs(input.grossPnl);
  let mfeUsd: number;
  let mfaUsd: number;
  if (input.isWin) {
    mfeUsd = absPnl * (1.05 + hash01(`${input.seedKey}-mfe`) * 0.45);
    mfaUsd = risk * (0.15 + hash01(`${input.seedKey}-mfa`) * 0.55);
  } else {
    mfeUsd = risk * (0.1 + hash01(`${input.seedKey}-mfe`) * 0.5);
    mfaUsd = Math.max(absPnl, risk * (0.7 + hash01(`${input.seedKey}-mfa`) * 0.5));
  }

  return {
    mfeUsd: roundMoney(mfeUsd),
    mfaUsd: roundMoney(mfaUsd),
    excursionInterval: hash01(`${input.seedKey}-exc-int`) > 0.35 ? "1m" : "5m",
    excursionComputedAt: input.closedAt,
  };
}

function buildManagePlaybook(input: {
  seedKey: string;
  isClosed: boolean;
  isLong: boolean;
  entryPrice: number;
  initialStop: number;
  qty: number;
  entryTime: string;
  exitTime: string | null;
}): ManagePlaybookJournal {
  const presetId = pick(PLAYBOOK_PRESET_IDS, `${input.seedKey}-pb`) as PlaybookPresetId;
  const preset = PLAYBOOK_PRESETS[presetId];
  const entry = roundMoney(input.entryPrice);
  const initialStop = roundMoney(input.initialStop);
  const rUnit = roundMoney(Math.abs(entry - initialStop));
  const side = input.isLong ? ("BUY" as const) : ("SELL" as const);
  const stopLabel = initialStop.toFixed(2);

  const ruleTimeline = preset.rules.map((rule, index) => {
    if (!input.isClosed) {
      if (index === 0) {
        return { ruleId: rule.id, status: "armed" as const };
      }
      return { ruleId: rule.id, status: "pending" as const };
    }

    const roll = hash01(`${input.seedKey}-rule-${rule.id}`);
    if (roll > 0.9) {
      return { ruleId: rule.id, status: "cancelled" as const };
    }
    if (roll > 0.72) {
      return {
        ruleId: rule.id,
        status: "skipped" as const,
        skippedReason: "Price never reached trigger",
      };
    }
    const firedAt = input.exitTime ?? input.entryTime;
    const firedDate = new Date(Date.parse(input.entryTime) + (index + 1) * 12 * 60_000);
    const capped =
      Date.parse(firedAt) > 0 && firedDate.getTime() > Date.parse(firedAt)
        ? firedAt
        : firedDate.toISOString();
    return {
      ruleId: rule.id,
      status: "fired" as const,
      firedAt: capped,
    };
  });

  const firedRuleCount = ruleTimeline.filter((r) => r.status === "fired").length;

  return {
    templateId: preset.id,
    templateName: preset.name,
    instanceId: demoUuidFromSeed(`${input.seedKey}-instance`),
    ruleTimeline,
    plannedRuleCount: preset.rules.length,
    firedRuleCount,
    positionPlan: {
      entry,
      initialStop,
      qty: input.qty,
      rUnit,
      side,
    },
    protectSummary: `Stop @ ${stopLabel}`,
  };
}

function buildTradeReviewFields(input: {
  seedKey: string;
  isWin: boolean;
  isClosed: boolean;
}): Pick<DemoTradeMetadata, "rating" | "reviewNote" | "ignored" | "setup" | "tags"> {
  const setup = pick(DEFAULT_JOURNAL_SETUP_VALUES, `${input.seedKey}-setup`);
  const tagCount = 1 + (hash01(`${input.seedKey}-tags`) > 0.45 ? 1 : 0) + (hash01(`${input.seedKey}-tags2`) > 0.7 ? 1 : 0);
  const tags: string[] = [];
  for (let ti = 0; ti < tagCount; ti += 1) {
    const tag = pick(TAG_POOL, `${input.seedKey}-tag-${ti}`);
    if (!tags.includes(tag)) tags.push(tag);
  }

  // Closed winners skew higher; losers and open trades still get a rating so the UI is populated.
  let rating: number;
  if (!input.isClosed) {
    rating = 3 + Math.floor(hash01(`${input.seedKey}-rating`) * 2); // 3–4
  } else if (input.isWin) {
    rating = 3 + Math.floor(hash01(`${input.seedKey}-rating`) * 3); // 3–5
  } else {
    rating = 1 + Math.floor(hash01(`${input.seedKey}-rating`) * 3); // 1–3
  }

  const ignored = hash01(`${input.seedKey}-ignored`) > 0.97;
  const reviewNote = pick(REVIEW_NOTE_POOL, `${input.seedKey}-note`);

  return { setup, tags, rating, reviewNote, ignored };
}

export type BuildDemoJournalFillsOptions = {
  /** Anchor end date for the window (default 2026-07-31 UTC for deterministic tests). */
  endDate?: Date;
  /** Weekday count (default 60). */
  weekdayCount?: number;
  /** Closed round-trips per weekday on average (default 2). */
  closedTradesPerDay?: number;
  /** Open positions left at end (default 4). */
  openPositionCount?: number;
  /** Real daily OHLC from Yahoo — skips days without a bar. */
  priceBook?: DemoPriceBook;
};

/**
 * Build a deterministic ~60-day demo journal dataset for dashboard visualization.
 */
export function buildDemoJournalFills(
  options: BuildDemoJournalFillsOptions = {},
): DemoJournalSeedBundle {
  const endDate = options.endDate ?? new Date("2026-07-31T00:00:00.000Z");
  const weekdayCount = options.weekdayCount ?? 60;
  const closedPerDay = options.closedTradesPerDay ?? 2;
  const openCount = options.openPositionCount ?? 4;
  const priceBook = options.priceBook;

  const start = new Date(endDate);
  start.setUTCDate(start.getUTCDate() - Math.ceil((weekdayCount * 7) / 5) - 14);
  const weekdays = addWeekdays(start, weekdayCount);

  const fills: JournalFillInput[] = [];
  const tradeMetadataByEntryExecId = new Map<string, DemoTradeMetadata>();
  let orderSeq = 1;
  let fillSeq = 1;

  for (let dayIdx = 0; dayIdx < weekdays.length; dayIdx += 1) {
    const day = weekdays[dayIdx]!;
    const tradesToday =
      dayIdx >= weekdays.length - 1
        ? 0
        : closedPerDay + (hash01(`day-trades-${dayIdx}`) > 0.65 ? 1 : 0);

    for (let t = 0; t < tradesToday; t += 1) {
      const seedKey = `closed-${dayIdx}-${t}`;
      const sym = SYMBOLS[(dayIdx * closedPerDay + t) % SYMBOLS.length]!;
      const isLong = hash01(`${seedKey}-dir`) > 0.38;
      const isWin = hash01(`${seedKey}-win`) > 0.42;
      const qty = pick([50, 75, 100, 150, 200], `${seedKey}-qty`);
      const entryHour = 14 + Math.floor(hash01(`${seedKey}-hour`) * 2);
      const entryMinute = Math.floor(hash01(`${seedKey}-min`) * 50) + 5;

      const prices = resolveTradePrices({
        seedKey,
        sym,
        day,
        isLong,
        isWin,
        priceBook,
      });
      if (!prices) continue;

      const { entryPrice, exitPrice, initialStop } = prices;
      const grossPnl = roundMoney(
        isLong ? (exitPrice - entryPrice) * qty : (entryPrice - exitPrice) * qty,
      );
      const commission = -1.0;
      const netPnl = roundMoney(grossPnl + commission * 2);
      const stopDistance = Math.abs(entryPrice - initialStop);
      const plannedRiskValue = roundMoney(stopDistance * qty);

      const entryExecId = `${DEMO_FILL_EXEC_ID_PREFIX}${fillSeq++}`;
      const exitExecId = `${DEMO_FILL_EXEC_ID_PREFIX}${fillSeq++}`;
      const entryOrderId = orderSeq++;
      const exitOrderId = orderSeq++;
      const entryTime = isoAt(day, entryHour, entryMinute);
      const exitTime = isoAt(day, entryHour + 1, entryMinute + 12);
      const edgeOrderRef =
        hash01(`${seedKey}-edge-ref`) > 0.55
          ? `edge-intent-${demoUuidFromSeed(`${seedKey}-intent`)}`
          : null;

      const entrySide = isLong ? "BOT" : "SLD";
      const exitSide = isLong ? "SLD" : "BOT";

      fills.push(
        buildFill({
          execId: entryExecId,
          fillTime: entryTime,
          side: entrySide,
          quantity: qty,
          price: entryPrice,
          symbol: sym.symbol,
          conId: sym.conId,
          commission,
          realizedPNL: null,
          orderId: entryOrderId,
          orderRef: edgeOrderRef,
        }),
      );
      fills.push(
        buildFill({
          execId: exitExecId,
          fillTime: exitTime,
          side: exitSide,
          quantity: qty,
          price: exitPrice,
          symbol: sym.symbol,
          conId: sym.conId,
          commission,
          realizedPNL: netPnl,
          orderId: exitOrderId,
          orderRef: edgeOrderRef,
        }),
      );

      const review = buildTradeReviewFields({ seedKey, isWin, isClosed: true });
      const excursion = buildExcursion({
        seedKey,
        isClosed: true,
        isWin,
        plannedRiskValue,
        grossPnl,
        closedAt: exitTime,
      });
      const managePlaybook = buildManagePlaybook({
        seedKey,
        isClosed: true,
        isLong,
        entryPrice,
        initialStop,
        qty,
        entryTime,
        exitTime,
      });

      tradeMetadataByEntryExecId.set(entryExecId, {
        entryExecId,
        ...review,
        plannedRiskMode: "usd",
        plannedRiskValue,
        initialStop,
        direction: isLong ? "long" : "short",
        ...excursion,
        managePlaybook,
      });
    }
  }

  for (let o = 0; o < openCount; o += 1) {
    const seedKey = `open-${o}`;
    const sym = SYMBOLS[o % SYMBOLS.length]!;
    const isLong = hash01(`${seedKey}-dir`) > 0.35;
    const qty = pick([50, 100, 150], `${seedKey}-qty`);
    const lastDay = weekdays[weekdays.length - 1]!;
    const entryHour = 15;

    const prices = resolveTradePrices({
      seedKey,
      sym,
      day: lastDay,
      isLong,
      isWin: true,
      priceBook,
    });
    if (!prices) continue;

    const { entryPrice, initialStop } = prices;
    const stopDistance = Math.abs(entryPrice - initialStop);
    const plannedRiskValue = roundMoney(stopDistance * qty);
    const entryExecId = `${DEMO_FILL_EXEC_ID_PREFIX}${fillSeq++}`;
    const entrySide = isLong ? "BOT" : "SLD";
    const entryTime = isoAt(lastDay, entryHour, 10 + o * 7);
    const edgeOrderRef = `edge-intent-${demoUuidFromSeed(`${seedKey}-intent`)}`;

    fills.push(
      buildFill({
        execId: entryExecId,
        fillTime: entryTime,
        side: entrySide,
        quantity: qty,
        price: entryPrice,
        symbol: sym.symbol,
        conId: sym.conId,
        commission: -1.0,
        realizedPNL: null,
        orderId: orderSeq++,
        orderRef: edgeOrderRef,
      }),
    );

    const review = buildTradeReviewFields({ seedKey, isWin: true, isClosed: false });
    const managePlaybook = buildManagePlaybook({
      seedKey,
      isClosed: false,
      isLong,
      entryPrice,
      initialStop,
      qty,
      entryTime,
      exitTime: null,
    });

    tradeMetadataByEntryExecId.set(entryExecId, {
      entryExecId,
      ...review,
      plannedRiskMode: "usd",
      plannedRiskValue,
      initialStop,
      direction: isLong ? "long" : "short",
      mfeUsd: null,
      mfaUsd: null,
      excursionInterval: null,
      excursionComputedAt: null,
      managePlaybook,
    });
  }

  fills.sort((a, b) => Date.parse(a.fillTime) - Date.parse(b.fillTime));

  return { fills, tradeMetadataByEntryExecId };
}
