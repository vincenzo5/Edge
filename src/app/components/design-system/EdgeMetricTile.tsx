"use client";

import type { ReactNode } from "react";
import EdgeHelpIcon from "./EdgeHelpIcon";
import { toneTextClass, type EdgeTone } from "@/lib/design-system/edge";

type Props = {
  label: string;
  value: ReactNode;
  help?: string;
  helpAriaLabel?: string;
  tone?: EdgeTone;
  /**
   * Visual shell for the tile. Default `plain` — label + value readout with no border.
   * Use plain for standalone metrics; prefer {@link EdgeReadout} for static values in forms.
   *
   * `bordered` adds a panel shell (border + padding) for tiles inside a **grouped metric card**
   * container. Do not use bordered on individual metrics to mimic input fields.
   *
   * @deprecated `bordered` on standalone tiles — migrate to plain or wrap metrics in a shared
   * card container instead of faking per-field borders.
   */
  variant?: "plain" | "bordered";
  labelUppercase?: boolean;
  valueClassName?: string;
  className?: string;
  "data-testid"?: string;
};

export default function EdgeMetricTile({
  label,
  value,
  help,
  helpAriaLabel,
  tone,
  variant = "plain",
  labelUppercase = false,
  valueClassName = "",
  className = "",
  "data-testid": testId,
}: Props) {
  const shellClass =
    variant === "bordered"
      ? "rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-2"
      : "";

  const labelClass = labelUppercase
    ? "text-[10px] uppercase text-[var(--edge-text-secondary)]"
    : "text-[10px] text-[var(--edge-text-secondary)]";

  const defaultValueClass =
    variant === "bordered"
      ? "text-xs font-medium text-[var(--edge-text-primary)]"
      : "mt-0.5 text-sm font-semibold tabular-nums text-[var(--edge-text-strong)]";

  return (
    <div data-testid={testId} className={`${shellClass} ${className}`.trim()}>
      <div className={`flex items-center gap-1 ${labelClass}`}>
        <span>{label}</span>
        {help ? (
          <EdgeHelpIcon content={help} ariaLabel={helpAriaLabel ?? `${label} help`} />
        ) : null}
      </div>
      <div
        className={`${defaultValueClass} ${tone ? toneTextClass(tone) : ""} ${valueClassName}`.trim()}
      >
        {value}
      </div>
    </div>
  );
}
