"use client";

import { useMemo } from "react";
import { fieldClass } from "../design-system/styles";
import {
  computeProtectLegValues,
  formatProtectInput,
  parseProtectInput,
  updateProtectLegField,
  type ProtectLinkField,
  type ProtectLegKind,
} from "@/lib/trading/linkedProtectLevels";
import type { RiskDirection } from "@edge/chart-core";

const ROWS: { field: ProtectLinkField; label: string }[] = [
  { field: "offset", label: "Offset" },
  { field: "price", label: "Price" },
  { field: "usd", label: "USD" },
  { field: "percent", label: "%" },
];

function useLegValues(args: {
  entry: number | null;
  price: number | null;
  quantity: number;
  direction: RiskDirection;
  leg: ProtectLegKind;
}) {
  return useMemo(() => {
    if (args.entry == null || args.price == null) {
      return { offset: null, price: null, usd: null, percent: null };
    }
    return computeProtectLegValues({
      entry: args.entry,
      price: args.price,
      quantity: args.quantity,
      direction: args.direction,
      leg: args.leg,
    });
  }, [args.direction, args.entry, args.leg, args.price, args.quantity]);
}

function LegFieldInput({
  visible,
  value,
  onChange,
  testId,
  label,
}: {
  visible: boolean;
  value: string;
  onChange: (raw: string) => void;
  testId: string;
  label: string;
}) {
  return (
    <input
      type="number"
      min={0}
      step="0.01"
      className={`${fieldClass({ density: "compact" })} w-full font-mono text-[11px]`}
      style={{ visibility: visible ? "visible" : "hidden" }}
      value={value}
      disabled={!visible}
      tabIndex={visible ? undefined : -1}
      onChange={(event) => onChange(event.target.value)}
      data-testid={testId}
      aria-label={label}
      aria-hidden={!visible}
    />
  );
}

export type LinkedProtectLevelsEditorProps = {
  entry: number | null;
  /** Entry quantity — default for exit legs when leg qty unset. */
  quantity: number;
  direction: RiskDirection;
  takeProfitEnabled: boolean;
  onTakeProfitEnabledChange: (enabled: boolean) => void;
  takeProfitPrice: number | null;
  onTakeProfitPriceChange: (price: number | null) => void;
  takeProfitQuantity: number;
  onTakeProfitQuantityChange: (quantity: number) => void;
  stopLossEnabled: boolean;
  onStopLossEnabledChange: (enabled: boolean) => void;
  stopLossPrice: number | null;
  onStopLossPriceChange: (price: number | null) => void;
  stopLossQuantity: number;
  onStopLossQuantityChange: (quantity: number) => void;
  testId?: string;
};

const QTY_ROW = { field: "qty" as const, label: "Qty" };

export function LinkedProtectLevelsEditor({
  entry,
  quantity,
  direction,
  takeProfitEnabled,
  onTakeProfitEnabledChange,
  takeProfitPrice,
  onTakeProfitPriceChange,
  takeProfitQuantity,
  onTakeProfitQuantityChange,
  stopLossEnabled,
  onStopLossEnabledChange,
  stopLossPrice,
  onStopLossPriceChange,
  stopLossQuantity,
  onStopLossQuantityChange,
  testId = "trade-linked-protect",
}: LinkedProtectLevelsEditorProps) {
  const takeProfitValues = useLegValues({
    entry,
    price: takeProfitPrice,
    quantity: takeProfitQuantity,
    direction,
    leg: "target",
  });
  const stopLossValues = useLegValues({
    entry,
    price: stopLossPrice,
    quantity: stopLossQuantity,
    direction,
    leg: "stop",
  });
  const showFields = takeProfitEnabled || stopLossEnabled;

  const handleFieldChange = (
    leg: ProtectLegKind,
    field: ProtectLinkField,
    raw: string,
    currentPrice: number | null,
    onPriceChange: (price: number | null) => void,
  ) => {
    if (entry == null) return;
    const parsed = parseProtectInput(raw);
    if (parsed == null && raw.trim() !== "") return;
    if (parsed == null) {
      onPriceChange(null);
      return;
    }
    const nextPrice = updateProtectLegField({
      entry,
      quantity: leg === "target" ? takeProfitQuantity : stopLossQuantity,
      direction,
      leg,
      field,
      value: parsed,
      currentPrice,
    });
    onPriceChange(nextPrice);
  };

  return (
    <div className="space-y-2" data-testid={testId}>
      <div className="grid grid-cols-[1fr_1fr] gap-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={takeProfitEnabled}
            onChange={(event) => onTakeProfitEnabledChange(event.target.checked)}
            data-testid={`${testId}-take-profit-enabled`}
          />
          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--edge-text-secondary)]">
            Take Profit
          </span>
        </label>
        <label className="flex items-center justify-end gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--edge-text-secondary)]">
            Stop Loss
          </span>
          <input
            type="checkbox"
            checked={stopLossEnabled}
            onChange={(event) => onStopLossEnabledChange(event.target.checked)}
            data-testid={`${testId}-stop-loss-enabled`}
          />
        </label>
      </div>

      {showFields ? (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 gap-y-1.5">
          <LegFieldInput
            visible={takeProfitEnabled}
            value={String(takeProfitQuantity)}
            onChange={(raw) => {
              const parsed = parseProtectInput(raw);
              if (parsed == null || parsed <= 0) return;
              onTakeProfitQuantityChange(Math.round(parsed));
            }}
            testId={`${testId}-take-profit-qty`}
            label="Take profit quantity"
          />
          <span className="px-1 text-center text-[10px] text-[var(--edge-text-secondary)]">
            {QTY_ROW.label}
          </span>
          <LegFieldInput
            visible={stopLossEnabled}
            value={String(stopLossQuantity)}
            onChange={(raw) => {
              const parsed = parseProtectInput(raw);
              if (parsed == null || parsed <= 0) return;
              onStopLossQuantityChange(Math.round(parsed));
            }}
            testId={`${testId}-stop-loss-qty`}
            label="Stop loss quantity"
          />
          {ROWS.map(({ field, label }) => (
            <div key={field} className="contents">
              <LegFieldInput
                visible={takeProfitEnabled}
                value={formatProtectInput(takeProfitValues[field])}
                onChange={(raw) =>
                  handleFieldChange("target", field, raw, takeProfitPrice, onTakeProfitPriceChange)
                }
                testId={`${testId}-take-profit-${field}`}
                label={`Take profit ${label}`}
              />
              <span className="px-1 text-center text-[10px] text-[var(--edge-text-secondary)]">
                {label}
              </span>
              <LegFieldInput
                visible={stopLossEnabled}
                value={formatProtectInput(stopLossValues[field])}
                onChange={(raw) =>
                  handleFieldChange("stop", field, raw, stopLossPrice, onStopLossPriceChange)
                }
                testId={`${testId}-stop-loss-${field}`}
                label={`Stop loss ${label}`}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
