"use client";

import { useId } from "react";
import EdgeBorderLabeledControl from "../design-system/EdgeBorderLabeledControl";
import EdgeSegmentedTabs from "../design-system/EdgeSegmentedTabs";
import { fieldClass } from "../design-system/styles";
import type { TicketBudgetUnit } from "@/lib/risk/policy/resolvePolicyTicketBudget";
import {
  dollarRiskFromTicketRiskInput,
  qtyFromTicketDollarRisk,
  ticketRiskFromQty,
} from "@/lib/risk/ticketSizeBudget";

export type TradeSizeBudgetFieldProps = {
  quantity: number;
  onQuantityChange: (qty: number) => void;
  riskUnit: TicketBudgetUnit;
  onRiskUnitChange: (unit: TicketBudgetUnit) => void;
  riskPercent: number | null;
  absoluteRisk: number | null;
  onRiskPercentChange: (value: number) => void;
  onAbsoluteRiskChange: (value: number) => void;
  entry: number | null;
  stop: number | null;
  accountBasisValue: number | null;
  disabled?: boolean;
  riskDisabled?: boolean;
  testId?: string;
};

const RISK_UNIT_SEGMENTS = [
  { id: "percent", label: "%" },
  { id: "absolute", label: "$" },
] as const;

export function TradeSizeBudgetField({
  quantity,
  onQuantityChange,
  riskUnit,
  onRiskUnitChange,
  riskPercent,
  absoluteRisk,
  onRiskPercentChange,
  onAbsoluteRiskChange,
  entry,
  stop,
  accountBasisValue,
  disabled = false,
  riskDisabled = false,
  testId = "trade-size-budget-field",
}: TradeSizeBudgetFieldProps) {
  const labelId = useId();
  const canSize =
    entry != null &&
    stop != null &&
    Number.isFinite(entry) &&
    Number.isFinite(stop) &&
    entry !== stop;
  const riskFieldDisabled = disabled || riskDisabled || !canSize;

  const handleQtyChange = (raw: string) => {
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      onQuantityChange(1);
      return;
    }
    const rounded = Math.max(1, Math.round(parsed));
    onQuantityChange(rounded);
    if (!canSize || entry == null || stop == null) return;
    const derived = ticketRiskFromQty({
      entry,
      stop,
      qty: rounded,
      unit: riskUnit,
      accountBasisValue,
    });
    if (riskUnit === "percent" && derived.riskPercent != null) {
      onRiskPercentChange(derived.riskPercent);
    }
    if (derived.absoluteRisk != null) {
      onAbsoluteRiskChange(derived.absoluteRisk);
    }
  };

  const handleRiskChange = (raw: string) => {
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    if (riskUnit === "percent") {
      onRiskPercentChange(parsed);
    } else {
      onAbsoluteRiskChange(parsed);
    }
    if (!canSize || entry == null || stop == null) return;
    const dollarRisk = dollarRiskFromTicketRiskInput({
      unit: riskUnit,
      riskPercent: riskUnit === "percent" ? parsed : riskPercent,
      absoluteRisk: riskUnit === "absolute" ? parsed : absoluteRisk,
      accountBasisValue,
    });
    if (dollarRisk == null) return;
    const sized = qtyFromTicketDollarRisk({ entry, stop, dollarRisk });
    if (sized != null && sized > 0) {
      onQuantityChange(sized);
    }
  };

  const handleUnitChange = (nextUnit: string) => {
    const unit = nextUnit as TicketBudgetUnit;
    if (unit === riskUnit) return;
    const dollarRisk = dollarRiskFromTicketRiskInput({
      unit: riskUnit,
      riskPercent,
      absoluteRisk,
      accountBasisValue,
    });
    onRiskUnitChange(unit);
    if (dollarRisk == null) return;
    if (unit === "percent") {
      const basis = accountBasisValue;
      if (basis != null && basis > 0) {
        onRiskPercentChange(Math.round((dollarRisk / basis) * 10_000) / 100);
      }
      onAbsoluteRiskChange(dollarRisk);
      return;
    }
    onAbsoluteRiskChange(dollarRisk);
  };

  const riskValue =
    riskUnit === "percent"
      ? riskPercent != null && Number.isFinite(riskPercent)
        ? String(riskPercent)
        : ""
      : absoluteRisk != null && Number.isFinite(absoluteRisk)
        ? String(absoluteRisk)
        : "";

  return (
    <EdgeBorderLabeledControl
      label="Size"
      labelId={labelId}
      labelSurface="panel"
      fullWidth
      className="w-full"
    >
      <div
        className="flex w-full min-w-0 items-stretch overflow-hidden rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)]"
        data-testid={testId}
      >
        <div className="flex min-w-0 flex-1 flex-col border-r border-[var(--edge-border)] px-2 py-1">
          <span className="text-[10px] text-[var(--edge-text-secondary)]">Qty</span>
          <input
            type="number"
            min={1}
            step={1}
            value={Number.isFinite(quantity) ? quantity : 1}
            disabled={disabled}
            aria-labelledby={labelId}
            data-testid="trade-size-qty"
            className={`${fieldClass({ density: "compact", disabled })} w-full min-w-0 border-0 bg-transparent px-0 shadow-none focus:ring-0`}
            onChange={(event) => handleQtyChange(event.target.value)}
          />
        </div>
        <div className="flex min-w-0 flex-[1.15] items-end gap-1 px-2 py-1">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-[var(--edge-text-secondary)]">Risk</span>
            {!canSize ? (
              <div
                className="text-sm font-semibold tabular-nums text-[var(--edge-text-strong)]"
                data-testid="trade-size-risk-readout"
                title="Set entry and stop before sizing from risk"
              >
                —
              </div>
            ) : (
              <input
                type="number"
                min={0}
                step={riskUnit === "percent" ? 0.25 : 1}
                value={riskValue}
                disabled={riskFieldDisabled}
                data-testid="trade-size-risk"
                title={
                  riskDisabled ? "Connect account NetLiq to edit percent risk" : undefined
                }
                className={`${fieldClass({
                  density: "compact",
                  disabled: riskFieldDisabled,
                })} w-full min-w-0 border-0 bg-transparent px-0 shadow-none focus:ring-0`}
                onChange={(event) => handleRiskChange(event.target.value)}
              />
            )}
          </div>
          <EdgeSegmentedTabs
            segments={[...RISK_UNIT_SEGMENTS]}
            value={riskUnit}
            onChange={handleUnitChange}
            className="shrink-0 [&_button]:min-h-[1.5rem] [&_button]:px-2 [&_button]:text-[10px]"
          />
        </div>
      </div>
    </EdgeBorderLabeledControl>
  );
}
