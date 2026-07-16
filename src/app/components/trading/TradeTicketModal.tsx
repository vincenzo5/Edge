"use client";

import { EdgeModalShell } from "../design-system";
import { TradeOrderForm } from "./TradeOrderForm";

type Props = {
  open: boolean;
  symbol: string;
  theme?: "dark" | "light";
  initialLimitPrice?: number | null;
  onClose: () => void;
};

/** Modal wrapper retained for tests; primary trade UX is the Trade sidebar panel. */
export default function TradeTicketModal({
  open,
  symbol,
  theme = "dark",
  initialLimitPrice,
  onClose,
}: Props) {
  const planLevels =
    initialLimitPrice != null && Number.isFinite(initialLimitPrice)
      ? {
          direction: "long" as const,
          side: "BUY" as const,
          entry: initialLimitPrice,
          stop: initialLimitPrice * 0.95,
          target: initialLimitPrice * 1.1,
          riskRewardRatio: 2,
        }
      : null;

  return (
    <EdgeModalShell
      open={open}
      title={`Trade ${symbol}`}
      onClose={onClose}
      maxWidth="sm"
      align="center"
      testId="trade-ticket-modal"
      footer={null}
    >
      <TradeOrderForm
        symbol={symbol}
        theme={theme}
        planLevels={planLevels}
        boundActive
        testId="trade-ticket-modal-form"
      />
    </EdgeModalShell>
  );
}
