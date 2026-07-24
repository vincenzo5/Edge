"use client";

import { useState } from "react";
import type { SymbolSelectResult } from "@/lib/watchlist/types";
import { SymbolSearchDialog } from "../design-system/symbol-search";

export default function WatchlistSearch({
  open,
  activeListName,
  onAdd,
  onClose,
}: {
  open: boolean;
  activeListName: string;
  onAdd: (result: SymbolSelectResult) => void;
  onClose: () => void;
}) {
  const [initialQuery, setInitialQuery] = useState("");

  const handleSelect = (result: SymbolSelectResult) => {
    onAdd(result);
    setInitialQuery("");
  };

  const handleClose = () => {
    setInitialQuery("");
    onClose();
  };

  return (
    <SymbolSearchDialog
      open={open}
      mode="add"
      title="Add symbol"
      subtitle={`Add to ${activeListName}`}
      onClose={handleClose}
      onSelect={handleSelect}
      testId="watchlist-add-symbol-modal"
      inputTestId="watchlist-add-symbol-input"
      inputAriaLabel="Search symbols to add"
      inputPlaceholder="Symbol, ISIN, or CUSIP"
      initialQuery={initialQuery}
    />
  );
}
