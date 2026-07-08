import type { JournalFill } from "@/lib/journal/types";

const COLUMN_ALIASES: Record<string, keyof ParsedFlexRow> = {
  "execution id": "execId",
  "exec id": "execId",
  execid: "execId",
  ibexecid: "execId",
  symbol: "symbol",
  "buy/sell": "side",
  side: "side",
  quantity: "quantity",
  qty: "quantity",
  "trade price": "price",
  tradeprice: "price",
  price: "price",
  "ib commission": "commission",
  ibcommission: "commission",
  commission: "commission",
  "realized p/l": "realizedPNL",
  "realized pnl": "realizedPNL",
  fifopnlrealized: "realizedPNL",
  conid: "conId",
  "con id": "conId",
  "order id": "orderId",
  orderid: "orderId",
  iborderid: "orderId",
  "order ref": "orderRef",
  orderref: "orderRef",
  orderreference: "orderRef",
  "put/call": "right",
  putcall: "right",
  strike: "strike",
  expiry: "expiry",
  "trade date/time": "fillTime",
  "trade datetime": "fillTime",
  datetime: "fillTime",
  date: "fillTime",
  time: "fillTime",
  "sec type": "secType",
  sectype: "secType",
  assetclass: "secType",
  multiplier: "multiplier",
  exchange: "exchange",
  account: "account",
  clientaccountid: "account",
};

type ParsedFlexRow = {
  execId?: string;
  symbol?: string;
  side?: string;
  quantity?: string;
  price?: string;
  commission?: string;
  realizedPNL?: string;
  conId?: string;
  orderId?: string;
  orderRef?: string;
  right?: string;
  strike?: string;
  expiry?: string;
  fillTime?: string;
  secType?: string;
  multiplier?: string;
  exchange?: string;
  account?: string;
};

export type ParseFlexCsvResult = {
  fills: JournalFill[];
  skipped: number;
  errors: string[];
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function parseNumber(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const cleaned = raw.replace(/[$,]/g, "").trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function normalizeSide(raw: string | undefined): string {
  const upper = (raw ?? "").trim().toUpperCase();
  if (upper.startsWith("B") || upper === "BOT") return "BOT";
  if (upper.startsWith("S") || upper === "SLD") return "SLD";
  return upper || "BOT";
}

function normalizeFillTime(raw: string | undefined): string {
  if (!raw?.trim()) return new Date().toISOString();
  const flexMatch = raw.trim().match(/^(\d{4})(\d{2})(\d{2});(\d{2})(\d{2})(\d{2})$/);
  if (flexMatch) {
    const [, year, month, day, hour, minute, second] = flexMatch;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
    if (Number.isFinite(parsed.getTime())) return parsed.toISOString();
  }
  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  return new Date().toISOString();
}

function rowToFill(row: ParsedFlexRow): JournalFill | null {
  const execId = row.execId?.trim();
  const symbol = row.symbol?.trim().toUpperCase();
  const rawQuantity = parseNumber(row.quantity);
  const price = parseNumber(row.price);
  if (!execId || !symbol || rawQuantity == null || rawQuantity === 0 || price == null) return null;

  const quantity = Math.abs(rawQuantity);
  const side = row.side?.trim()
    ? normalizeSide(row.side)
    : rawQuantity < 0
      ? "SLD"
      : "BOT";

  const secType = row.secType?.trim().toUpperCase() || (row.right || row.strike ? "OPT" : "STK");
  const conId = parseNumber(row.conId);

  return {
    execId,
    account: row.account?.trim() || null,
    fillTime: normalizeFillTime(row.fillTime),
    side,
    quantity,
    price,
    orderId: parseNumber(row.orderId),
    orderRef: row.orderRef?.trim() || null,
    exchange: row.exchange?.trim() || null,
    contract: {
      conId: conId != null ? Math.trunc(conId) : null,
      symbol,
      secType,
      strike: parseNumber(row.strike),
      right: row.right?.trim().toUpperCase() || null,
      lastTradeDateOrContractMonth: row.expiry?.trim() || null,
      multiplier: row.multiplier?.trim() || null,
    },
    commission: parseNumber(row.commission),
    realizedPNL: parseNumber(row.realizedPNL),
    source: "flex_csv",
  };
}

export function parseFlexCsv(csvText: string): ParseFlexCsvResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return { fills: [], skipped: 0, errors: ["CSV must include a header row and at least one data row."] };
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const mappedHeaders = headers.map((header) => COLUMN_ALIASES[header] ?? null);
  const unmapped = headers.filter((header, index) => !mappedHeaders[index] && header.length > 0);
  const requiredMapped = ["execId", "symbol", "side", "quantity", "price"].every((field) =>
    mappedHeaders.includes(field as keyof ParsedFlexRow),
  );
  if (!requiredMapped) {
    return {
      fills: [],
      skipped: 0,
      errors: [
        `Missing required columns. Map Execution ID, Symbol, Buy/Sell, Quantity, and Price. Unmapped: ${unmapped.join(", ") || "none"}`,
      ],
    };
  }

  const fills: JournalFill[] = [];
  let skipped = 0;
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const row: ParsedFlexRow = {};
    mappedHeaders.forEach((field, index) => {
      if (!field) return;
      row[field] = cells[index] ?? "";
    });
    const fill = rowToFill(row);
    if (!fill) {
      skipped += 1;
      continue;
    }
    fills.push(fill);
  }

  return { fills, skipped, errors: [] };
}
