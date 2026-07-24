"use client";

import { EdgeSlideOver } from "@/app/components/design-system";
import JournalTradeDetail from "@/app/components/journal/JournalTradeDetail";
import JournalTradeDetailHeaderTitle from "@/app/components/journal/JournalTradeDetailHeaderTitle";
import {
  journalTradeDetailAriaLabel,
  journalTradeDetailSubtitle,
} from "@/app/components/journal/journalTradeDetailTitle";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

type Props = {
  trade: JournalTradeResponse | null;
  onClose: () => void;
  onUpdated: (trade: JournalTradeResponse) => void;
};

export default function JournalTradeDetailDrawer({ trade, onClose, onUpdated }: Props) {
  if (!trade) return null;

  return (
    <EdgeSlideOver
      open
      title={<JournalTradeDetailHeaderTitle trade={trade} />}
      ariaLabel={journalTradeDetailAriaLabel(trade)}
      subtitle={journalTradeDetailSubtitle(trade)}
      onClose={onClose}
      testId="journal-trade-detail-drawer"
    >
      <JournalTradeDetail trade={trade} onUpdated={onUpdated} embedded />
    </EdgeSlideOver>
  );
}
