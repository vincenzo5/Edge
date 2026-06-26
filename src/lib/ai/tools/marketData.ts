import { z } from "zod";
import { defineTool } from "../types";
import type { AiTool } from "../types";
import { INTERVALS, RANGES, symbolSchema, symbolsSchema } from "../schemas";

export const searchSymbolsTool = defineTool({
  name: "search_symbols",
  description: "Search Yahoo Finance for equity symbols matching a query string.",
  inputSchema: z.object({
    query: z.string().trim().min(1),
    limit: z.number().int().min(1).max(20).optional(),
  }),
  permission: "read",
  requiresConfirmation: false,
  async execute(input, context) {
    const results = await context.marketData.searchSymbols(
      input.query,
      input.limit ?? 8,
    );
    return { ok: true, data: { results } };
  },
});

export const getCandlesTool = defineTool({
  name: "get_candles",
  description: "Fetch OHLCV candle data for a symbol, range, and interval.",
  inputSchema: z.object({
    symbol: symbolSchema,
    range: z.enum(RANGES),
    interval: z.enum(INTERVALS),
    before: z.number().optional(),
    barCount: z.number().int().min(1).max(500).optional(),
  }),
  permission: "read",
  requiresConfirmation: false,
  async execute(input, context) {
    const candles = await context.marketData.getCandles(input);
    return {
      ok: true,
      data: { symbol: input.symbol, count: candles.length, candles },
    };
  },
});

export const getQuotesTool = defineTool({
  name: "get_quotes",
  description: "Fetch live quote snapshots for one or more symbols.",
  inputSchema: z.object({ symbols: symbolsSchema }),
  permission: "read",
  requiresConfirmation: false,
  async execute(input, context) {
    const quotes = await context.marketData.getQuotes(input.symbols);
    return { ok: true, data: { quotes } };
  },
});

export const getFundamentalsTool = defineTool({
  name: "get_fundamentals",
  description: "Fetch company fundamentals and profile data for a symbol.",
  inputSchema: z.object({ symbol: symbolSchema }),
  permission: "read",
  requiresConfirmation: false,
  async execute(input, context) {
    const data = await context.marketData.getFundamentals(input.symbol);
    return { ok: true, data };
  },
});

const optionExpirationSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expiration must be YYYY-MM-DD");

export const getOptionsExpirationsTool = defineTool({
  name: "get_options_expirations",
  description: "Fetch available option expiration dates for an underlying symbol.",
  inputSchema: z.object({ underlying: symbolSchema }),
  permission: "read",
  requiresConfirmation: false,
  async execute(input, context) {
    const expirations = await context.marketData.getOptionExpirations(input.underlying);
    return {
      ok: true,
      data: { underlying: input.underlying, expirations },
    };
  },
});

export const getOptionsChainTool = defineTool({
  name: "get_options_chain",
  description: "Fetch the options chain for an underlying symbol and expiration date.",
  inputSchema: z.object({
    underlying: symbolSchema,
    expiration: optionExpirationSchema,
  }),
  permission: "read",
  requiresConfirmation: false,
  async execute(input, context) {
    const chain = await context.marketData.getOptionsChain(
      input.underlying,
      input.expiration,
    );
    return {
      ok: true,
      data: {
        underlying: input.underlying,
        expiration: input.expiration,
        contractCount: chain.contracts.length,
        chain,
      },
    };
  },
});

export const marketDataTools: AiTool[] = [
  searchSymbolsTool,
  getCandlesTool,
  getQuotesTool,
  getFundamentalsTool,
  getOptionsExpirationsTool,
  getOptionsChainTool,
];
