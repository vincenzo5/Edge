import type { ChartReferenceLine } from "@edge/chart-core";
import type { HoldToStopVerdict } from "@/lib/risk/marginContext";
import { formatHoldToStopPrice } from "@/lib/risk/marginContext";

/** Build a non-persisted margin-call guide line for the active chart. */
export function buildMarginCallReferenceLines(
  price: number | null | undefined,
  verdict: HoldToStopVerdict = "stop_reachable",
): ChartReferenceLine[] {
  if (price == null || !Number.isFinite(price)) return [];

  return [
    {
      id: "risk-margin-call",
      price,
      label: `MARGIN CALL ${formatHoldToStopPrice(price)}`,
      color:
        verdict === "margin_call_first"
          ? "var(--edge-negative)"
          : "var(--edge-warning)",
      lineWidth: 1,
      lineDash: [6, 4],
    },
  ];
}
