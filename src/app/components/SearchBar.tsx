"use client";

import { useEffect, useRef, useState } from "react";
import type { Theme } from "@/lib/chartConfig";
import {
  SymbolSearchDialog,
  SymbolSearchTrigger,
  type SymbolSearchResult,
} from "./design-system/symbol-search";

export default function SearchBar({
  onSelect,
  initial = "",
  compact = true,
  theme = "dark",
}: {
  onSelect: (result: SymbolSearchResult) => void;
  initial?: string;
  compact?: boolean;
  theme?: Theme;
}) {
  const [symbol, setSymbol] = useState(initial);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  void theme;
  void compact;

  useEffect(() => {
    setSymbol(initial);
  }, [initial]);

  const handleSelect = (result: SymbolSearchResult) => {
    onSelect(result);
    setSymbol(result.symbol);
    setOpen(false);
  };

  return (
    <div className="relative w-auto min-w-[112px]">
      <SymbolSearchTrigger
        ref={triggerRef}
        symbol={symbol}
        onOpen={() => setOpen(true)}
        aria-label="Search symbol"
      />
      <SymbolSearchDialog
        open={open}
        mode="select"
        title="Symbol search"
        onClose={() => setOpen(false)}
        onSelect={handleSelect}
        returnFocusRef={triggerRef}
        testId="symbol-search-modal"
        inputTestId="symbol-search-modal-input"
        inputAriaLabel="Search symbol"
        initialQuery={symbol}
      />
    </div>
  );
}
