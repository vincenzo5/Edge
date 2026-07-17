"use client";

import { useEffect } from "react";

import {
  applyBrowserTabQuote,
  clearBrowserTabQuote,
} from "@/lib/app/browserTabQuote";
import { useMarketDataQuotesForSymbols } from "../MarketDataProvider";

type Props = {
  symbol: string;
  enabled: boolean;
};

export default function PrimaryChartBrowserTabQuote({ symbol, enabled }: Props) {
  const { quotes } = useMarketDataQuotesForSymbols(enabled ? [symbol] : []);
  const quote = quotes[0];

  useEffect(() => {
    if (!enabled) return;

    applyBrowserTabQuote({
      symbol,
      price: quote?.regularMarketPrice,
      changePercent: quote?.regularMarketChangePercent,
    });
  }, [enabled, symbol, quote?.regularMarketPrice, quote?.regularMarketChangePercent]);

  useEffect(() => {
    if (!enabled) return;
    return () => {
      clearBrowserTabQuote();
    };
  }, [enabled]);

  return null;
}
