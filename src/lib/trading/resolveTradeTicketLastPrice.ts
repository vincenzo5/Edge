/** Resolve trade-ticket entry reference: live quote, else last candle close. */
export function resolveTradeTicketLastPrice(args: {
  quotePrice?: number | null;
  lastCandleClose?: number | null;
}): number | null {
  const quote = args.quotePrice;
  if (quote != null && Number.isFinite(quote)) return quote;
  const close = args.lastCandleClose;
  if (close != null && Number.isFinite(close)) return close;
  return null;
}
