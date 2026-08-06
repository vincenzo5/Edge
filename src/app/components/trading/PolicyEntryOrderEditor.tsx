"use client";

import { useMemo } from "react";
import EdgeLabeledInput from "../design-system/EdgeLabeledInput";
import { EdgeSegmentedTabs, EdgeToggleSwitch, EdgeUnderlineTabs } from "../design-system";
import {
  defaultEntryOrder,
  type EntryOrder,
} from "@/lib/trading/orderExecutionRecipe";
import {
  composeOrderType,
  decomposeOrderType,
  EXEC_TYPE_SEGMENTS,
  FILL_SEGMENTS,
  ORDER_FAMILY_TABS,
  type OrderExecType,
  type OrderFamily,
  type OrderFillTiming,
} from "@/lib/trading/orderTypeFamily";
import type { TimeInForce } from "@/lib/trading/types";
import {
  isTifValidForOrderType,
  supportsPriceMgmtAlgo,
  tifLabel,
  tifOptionsForOrderType,
} from "@/lib/trading/orderTicketOptions";
import { bracketEntryRejectReason } from "@/lib/trading/orderExecutionRecipe";
import { PolicyEditorLabeledSelect } from "./policyEditorFields";
import { POLICY_EDITOR_FIELD_HELP } from "./policyEditorCopy";

export type PolicyEntryOrderEditorProps = {
  value: EntryOrder;
  onChange: (next: EntryOrder) => void;
  protectConfigured?: boolean;
  disabled?: boolean;
};

function parseOptionalNumber(raw: string): number | undefined {
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function PolicyEntryOrderEditor({
  value,
  onChange,
  protectConfigured = false,
  disabled = false,
}: PolicyEntryOrderEditorProps) {
  const orderType = value.orderType ?? defaultEntryOrder().orderType;
  const orderTypeFamily = useMemo(() => decomposeOrderType(orderType), [orderType]);
  const tifOptions = useMemo(
    () =>
      tifOptionsForOrderType(orderType).map((tif) => ({
        value: tif,
        label: tifLabel(tif),
      })),
    [orderType],
  );
  const bracketReject = protectConfigured
    ? bracketEntryRejectReason({ orderType, protectRequested: true })
    : null;

  const patch = (partial: Partial<EntryOrder>) => onChange({ ...value, ...partial });

  const applyFamilyTab = (family: OrderFamily) => {
    const next = composeOrderType({
      family,
      fill: orderTypeFamily.fill,
      execType: orderTypeFamily.execType,
    });
    patch({
      orderType: next,
      tif: isTifValidForOrderType(next, value.tif ?? "DAY")
        ? value.tif
        : tifOptionsForOrderType(next)[0] ?? "DAY",
    });
  };

  return (
    <div className="flex flex-col gap-4" data-testid="policy-entry-order-editor">
      <EdgeUnderlineTabs
        segments={ORDER_FAMILY_TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
        value={orderTypeFamily.family}
        onChange={(family) => applyFamilyTab(family as OrderFamily)}
      />

      {(orderTypeFamily.family === "market" || orderTypeFamily.family === "limit") && (
        <EdgeSegmentedTabs
          segments={[...FILL_SEGMENTS]}
          value={orderTypeFamily.fill ?? "now"}
          onChange={(fill) =>
            patch({
              orderType: composeOrderType({
                family: orderTypeFamily.family,
                fill: fill as OrderFillTiming,
                execType: orderTypeFamily.execType,
              }),
            })
          }
        />
      )}

      {(orderTypeFamily.family === "stop" || orderTypeFamily.family === "trail") && (
        <EdgeSegmentedTabs
          segments={[...EXEC_TYPE_SEGMENTS]}
          value={orderTypeFamily.execType ?? "market"}
          onChange={(execType) =>
            patch({
              orderType: composeOrderType({
                family: orderTypeFamily.family,
                fill: orderTypeFamily.fill,
                execType: execType as OrderExecType,
              }),
            })
          }
        />
      )}

      {(orderType === "LMT" ||
        orderType === "STP LMT" ||
        orderType === "TRAIL LIMIT" ||
        orderType === "LOC") && (
        <EdgeLabeledInput
          label="Limit price"
          type="number"
          min={0}
          step="0.01"
          value={value.limitPrice != null ? String(value.limitPrice) : ""}
          onChange={(event) => patch({ limitPrice: parseOptionalNumber(event.target.value) })}
          disabled={disabled}
        />
      )}

      {(orderType === "STP" || orderType === "STP LMT" || orderType === "TRAIL" || orderType === "TRAIL LIMIT") && (
        <EdgeLabeledInput
          label={orderType === "TRAIL" || orderType === "TRAIL LIMIT" ? "Trail amount ($)" : "Stop price"}
          type="number"
          min={0}
          step="0.01"
          value={value.stopPrice != null ? String(value.stopPrice) : ""}
          onChange={(event) => patch({ stopPrice: parseOptionalNumber(event.target.value) })}
          disabled={disabled}
        />
      )}

      {(orderType === "TRAIL" || orderType === "TRAIL LIMIT") && (
        <EdgeLabeledInput
          label="Trail percent"
          type="number"
          min={0}
          step="0.1"
          value={value.trailPercent != null ? String(value.trailPercent) : ""}
          onChange={(event) => patch({ trailPercent: parseOptionalNumber(event.target.value) })}
          disabled={disabled}
        />
      )}

      <PolicyEditorLabeledSelect
        label="Time in force"
        help={POLICY_EDITOR_FIELD_HELP.entryTif}
        value={value.tif ?? "DAY"}
        onChange={(event) => patch({ tif: event.target.value as TimeInForce })}
        disabled={disabled}
      >
        {tifOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </PolicyEditorLabeledSelect>

      <label className="flex items-center justify-between gap-2 text-[12px] text-[var(--edge-text-secondary)]">
        <span>All or none</span>
        <EdgeToggleSwitch
          checked={value.allOrNone ?? false}
          onChange={(checked) => patch({ allOrNone: checked })}
          disabled={disabled}
          ariaLabel="All or none"
        />
      </label>

      <label className="flex items-center justify-between gap-2 text-[12px] text-[var(--edge-text-secondary)]">
        <span>Extended hours</span>
        <EdgeToggleSwitch
          checked={value.outsideRth ?? false}
          onChange={(checked) => patch({ outsideRth: checked })}
          disabled={disabled}
          ariaLabel="Extended hours"
        />
      </label>

      {supportsPriceMgmtAlgo(orderType) ? (
        <label className="flex items-center justify-between gap-2 text-[12px] text-[var(--edge-text-secondary)]">
          <span>Price management algo</span>
          <EdgeToggleSwitch
            checked={value.usePriceMgmtAlgo ?? false}
            onChange={(checked) => patch({ usePriceMgmtAlgo: checked })}
            disabled={disabled}
            ariaLabel="Price management algo"
          />
        </label>
      ) : null}

      {bracketReject ? (
        <p className="text-[12px] text-[var(--edge-warning)]" data-testid="policy-entry-bracket-warning">
          {bracketReject}
        </p>
      ) : null}
    </div>
  );
}
