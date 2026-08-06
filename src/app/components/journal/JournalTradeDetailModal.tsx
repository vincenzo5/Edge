"use client";

import { EdgeModalShell } from "@/app/components/design-system";
import JournalTradeDetail from "@/app/components/journal/JournalTradeDetail";
import JournalTradeDetailHeaderSubtitle from "@/app/components/journal/JournalTradeDetailHeaderSubtitle";
import JournalTradeDetailHeaderTitle, {
  JournalTradeDetailHeaderMeta,
} from "@/app/components/journal/JournalTradeDetailHeaderTitle";
import { journalTradeDetailAriaLabel } from "@/app/components/journal/journalTradeDetailTitle";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

type Props = {
  trade: JournalTradeResponse | null;
  onClose: () => void;
  onUpdated: (trade: JournalTradeResponse) => void;
};

export default function JournalTradeDetailModal({ trade, onClose, onUpdated }: Props) {
  if (!trade) return null;

  return (
    <EdgeModalShell
      open
      title={<JournalTradeDetailHeaderTitle trade={trade} />}
      ariaLabel={journalTradeDetailAriaLabel(trade)}
      subtitle={<JournalTradeDetailHeaderSubtitle trade={trade} />}
      headerActions={<JournalTradeDetailHeaderMeta trade={trade} />}
      onClose={onClose}
      maxWidth="lg"
      align="center"
      testId="journal-trade-detail-modal"
    >
      <JournalTradeDetail trade={trade} onUpdated={onUpdated} embedded />
    </EdgeModalShell>
  );
}
