"use client";

import { useMemo } from "react";
import type { RiskDirection } from "@edge/chart-core";
import {
  formatPositionPrice,
  levelsAfterEntryChange,
  parseFiniteNumber,
  priceFromEntryTicks,
  ticksBetweenPrices,
  type PositionSettingsDraft,
} from "@edge/chart-core";
import { EdgeSelect } from "../design-system";
import { fieldClass } from "../design-system/styles";

type Props = {
  draft: PositionSettingsDraft;
  direction: RiskDirection;
  onChange: (next: PositionSettingsDraft) => void;
};

const labelClass = "text-sm text-[var(--edge-text-secondary)]";
const sectionClass =
  "pt-1 text-[11px] font-medium uppercase tracking-wide text-[var(--edge-text-muted)]";
const inputClass = `${fieldClass({ density: "compact" })} w-full min-w-0 text-right`;
const rowClass = "flex items-center justify-between gap-3";

function LevelSection({
  title,
  ticks,
  price,
  tickSize,
  onTicksChange,
  onPriceChange,
}: {
  title: string;
  ticks: number;
  price: number;
  tickSize: number;
  onTicksChange: (ticks: number) => void;
  onPriceChange: (price: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className={sectionClass}>{title}</div>
      <label className={rowClass}>
        <span className={labelClass}>Ticks</span>
        <input
          type="number"
          min={1}
          step={1}
          value={ticks}
          onChange={(e) => {
            const parsed = parseFiniteNumber(e.target.value);
            if (parsed == null) return;
            onTicksChange(Math.max(0, Math.round(parsed)));
          }}
          className={`${inputClass} max-w-[9rem]`}
          data-testid={`position-inputs-${title.toLowerCase().includes("profit") ? "profit" : "stop"}-ticks`}
        />
      </label>
      <label className={rowClass}>
        <span className={labelClass}>Price</span>
        <input
          type="number"
          step={tickSize}
          value={formatPositionPrice(price, tickSize)}
          onChange={(e) => {
            const parsed = parseFiniteNumber(e.target.value);
            if (parsed == null) return;
            onPriceChange(parsed);
          }}
          className={`${inputClass} max-w-[9rem]`}
          data-testid={`position-inputs-${title.toLowerCase().includes("profit") ? "profit" : "stop"}-price`}
        />
      </label>
    </div>
  );
}

export default function PositionDrawingInputs({ draft, direction, onChange }: Props) {
  const stopTicks = useMemo(
    () => ticksBetweenPrices(draft.entry, draft.stop, draft.tickSize),
    [draft.entry, draft.stop, draft.tickSize],
  );
  const profitTicks = useMemo(
    () => ticksBetweenPrices(draft.entry, draft.target, draft.tickSize),
    [draft.entry, draft.target, draft.tickSize],
  );

  return (
    <div className="space-y-3" data-testid="position-drawing-inputs">
      <label className={rowClass}>
        <span className={labelClass}>Risk</span>
        <div className="flex min-w-0 items-center gap-2">
          <input
            type="number"
            min={0}
            step={0.01}
            value={Number.isFinite(draft.riskPercent) ? draft.riskPercent : ""}
            onChange={(e) => {
              const parsed = parseFiniteNumber(e.target.value);
              if (parsed == null) return;
              onChange({ ...draft, riskPercent: Math.max(0, parsed) });
            }}
            className={`${inputClass} w-[6.5rem]`}
            data-testid="position-inputs-risk"
          />
          <EdgeSelect
            variant="field"
            density="compact"
            value={draft.riskUnit}
            onChange={() => {
              /* percent-only for now */
            }}
            options={[{ value: "percent", label: "%" }]}
            className="w-[4.5rem]"
            aria-label="Risk unit"
          />
        </div>
      </label>

      <label className={rowClass}>
        <span className={labelClass}>Entry price</span>
        <input
          type="number"
          step={draft.tickSize}
          value={formatPositionPrice(draft.entry, draft.tickSize)}
          onChange={(e) => {
            const parsed = parseFiniteNumber(e.target.value);
            if (parsed == null) return;
            const levels = levelsAfterEntryChange(draft, parsed, draft.tickSize, direction);
            onChange({ ...draft, ...levels });
          }}
          className={`${inputClass} max-w-[9rem]`}
          data-testid="position-inputs-entry"
        />
      </label>

      <LevelSection
        title="Profit level"
        ticks={profitTicks}
        price={draft.target}
        tickSize={draft.tickSize}
        onTicksChange={(ticks) => {
          onChange({
            ...draft,
            target: priceFromEntryTicks(
              draft.entry,
              ticks,
              draft.tickSize,
              direction,
              "target",
            ),
          });
        }}
        onPriceChange={(target) => onChange({ ...draft, target })}
      />

      <LevelSection
        title="Stop level"
        ticks={stopTicks}
        price={draft.stop}
        tickSize={draft.tickSize}
        onTicksChange={(ticks) => {
          onChange({
            ...draft,
            stop: priceFromEntryTicks(
              draft.entry,
              ticks,
              draft.tickSize,
              direction,
              "stop",
            ),
          });
        }}
        onPriceChange={(stop) => onChange({ ...draft, stop })}
      />
    </div>
  );
}
