import { z } from "zod";
import { defineTool } from "../types";
import type { AiTool } from "../types";
import type { ToolContext } from "../context";
import { symbolSchema, symbolsSchema } from "../schemas";
import type { WatchlistActions } from "../context";
import {
  addWatchlistItem,
  clearWatchlist,
  createWatchlist,
  deleteWatchlist,
  getActiveWatchlist,
  removeWatchlistItem,
  renameWatchlist,
  switchWatchlist,
} from "@/lib/watchlist/storage";

function requireWatchlist(context: ToolContext): WatchlistActions {
  if (!context.watchlist) {
    throw new Error("Watchlist actions unavailable");
  }
  return context.watchlist;
}

export const getWatchlistsTool = defineTool({
  name: "get_watchlists",
  description: "Read all watchlists, active watchlist id, and selected symbol.",
  inputSchema: z.object({}),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(_input, context) {
    const wl = requireWatchlist(context);
    return { ok: true, data: wl.getState() };
  },
});

export const createWatchlistTool = defineTool({
  name: "create_watchlist",
  description: "Create a new watchlist and make it active.",
  inputSchema: z.object({ name: z.string().trim().optional() }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const wl = requireWatchlist(context);
    wl.setState((prev) => createWatchlist(prev, input.name));
    const state = wl.getState();
    return {
      ok: true,
      data: {
        activeWatchlistId: state.activeWatchlistId,
        watchlist: getActiveWatchlist(state),
      },
    };
  },
});

export const renameWatchlistTool = defineTool({
  name: "rename_watchlist",
  description: "Rename a watchlist by id.",
  inputSchema: z.object({
    watchlistId: z.string().min(1),
    name: z.string().trim().min(1),
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const wl = requireWatchlist(context);
    wl.setState((prev) => renameWatchlist(prev, input.watchlistId, input.name));
    return { ok: true, data: { watchlistId: input.watchlistId, name: input.name } };
  },
});

export const switchWatchlistTool = defineTool({
  name: "switch_watchlist",
  description: "Switch the active watchlist by id.",
  inputSchema: z.object({ watchlistId: z.string().min(1) }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const wl = requireWatchlist(context);
    wl.setState((prev) => switchWatchlist(prev, input.watchlistId));
    return { ok: true, data: { activeWatchlistId: input.watchlistId } };
  },
});

export const addWatchlistSymbolsTool = defineTool({
  name: "add_watchlist_symbols",
  description: "Add one or more symbols to the active watchlist.",
  inputSchema: z.object({
    symbols: symbolsSchema,
    watchlistId: z.string().min(1).optional(),
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const wl = requireWatchlist(context);
    wl.setState((prev) => {
      let next = prev;
      if (
        input.watchlistId &&
        input.watchlistId !== prev.activeWatchlistId
      ) {
        next = switchWatchlist(prev, input.watchlistId);
      }
      for (const symbol of input.symbols) {
        next = addWatchlistItem(next, { symbol });
      }
      return next;
    });
    const state = wl.getState();
    return {
      ok: true,
      data: {
        watchlist: getActiveWatchlist(state),
        added: input.symbols,
      },
    };
  },
});

export const removeWatchlistSymbolsTool = defineTool({
  name: "remove_watchlist_symbols",
  description: "Remove symbols from the active watchlist.",
  inputSchema: z.object({ symbols: symbolsSchema }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const wl = requireWatchlist(context);
    wl.setState((prev) => {
      let next = prev;
      for (const symbol of input.symbols) {
        next = removeWatchlistItem(next, symbol);
      }
      return next;
    });
    return { ok: true, data: { removed: input.symbols } };
  },
});

export const clearWatchlistTool = defineTool({
  name: "clear_watchlist",
  description: "Remove all symbols from a watchlist.",
  inputSchema: z.object({ watchlistId: z.string().min(1) }),
  permission: "destructive",
  requiresConfirmation: true,
  requiresClientSession: true,
  async execute(input, context) {
    const wl = requireWatchlist(context);
    wl.setState((prev) => clearWatchlist(prev, input.watchlistId));
    return { ok: true, data: { watchlistId: input.watchlistId, cleared: true } };
  },
});

export const deleteWatchlistTool = defineTool({
  name: "delete_watchlist",
  description: "Delete a watchlist by id. Cannot delete the last remaining list.",
  inputSchema: z.object({ watchlistId: z.string().min(1) }),
  permission: "destructive",
  requiresConfirmation: true,
  requiresClientSession: true,
  async execute(input, context) {
    const wl = requireWatchlist(context);
    wl.setState((prev) => deleteWatchlist(prev, input.watchlistId));
    const state = wl.getState();
    return {
      ok: true,
      data: {
        deletedId: input.watchlistId,
        activeWatchlistId: state.activeWatchlistId,
      },
    };
  },
});

export const loadWatchlistSymbolTool = defineTool({
  name: "load_watchlist_symbol",
  description: "Load a watchlist symbol into the active chart.",
  inputSchema: z.object({ symbol: symbolSchema }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    if (!context.chart) throw new Error("Chart actions unavailable");
    const wl = requireWatchlist(context);
    const state = wl.getState();
    const active = getActiveWatchlist(state);
    const item = active.items.find((i) => i.symbol === input.symbol);
    if (!item) {
      return {
        ok: false,
        error: `Symbol ${input.symbol} not in active watchlist`,
        code: "execution",
      };
    }
    context.chart.loadSymbolIntoActiveChart({
      symbol: item.symbol,
      name: item.name ?? item.symbol,
      exchange: item.exchange ?? "",
    });
    return { ok: true, data: { symbol: item.symbol } };
  },
});

export const watchlistTools: AiTool[] = [
  getWatchlistsTool,
  createWatchlistTool,
  renameWatchlistTool,
  switchWatchlistTool,
  addWatchlistSymbolsTool,
  removeWatchlistSymbolsTool,
  clearWatchlistTool,
  deleteWatchlistTool,
  loadWatchlistSymbolTool,
];
