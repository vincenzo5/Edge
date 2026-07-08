export const JOURNAL_GLOBAL_EMPTY_MESSAGE =
  "No trades yet. Import Flex CSV history or sync live IBKR fills.";

export const JOURNAL_SCOPED_EMPTY_MESSAGE = "No closed trades in the current scope.";

export const JOURNAL_FILTERED_EMPTY_MESSAGE = "No trades match these filters.";

export const JOURNAL_LIST_CARD_EMPTY_MESSAGES = {
  recent: "No recent trades to show here",
  open: "No open positions to show here",
} as const;

export const JOURNAL_LIST_CARD_EMPTY_HINT = "Try selecting different filters";
