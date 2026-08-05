"use client";

import type { ReactNode } from "react";
import EdgeHelpIcon from "./EdgeHelpIcon";
import { toneTextClass, type EdgeTone } from "@/lib/design-system/edge";

export type EdgeReadoutProps = {
  label: string;
  value: ReactNode;
  help?: string;
  helpAriaLabel?: string;
  tone?: EdgeTone;
  /** Center value text (e.g. market order entry display). */
  align?: "start" | "center";
  labelUppercase?: boolean;
  valueClassName?: string;
  className?: string;
  testId?: string;
};

/** Flush label + value for computed or fixed data — no field chrome, not focusable. */
export default function EdgeReadout({
  label,
  value,
  help,
  helpAriaLabel,
  tone,
  align = "start",
  labelUppercase = false,
  valueClassName = "",
  className = "",
  testId,
}: EdgeReadoutProps) {
  const labelClass = labelUppercase
    ? "text-[10px] uppercase text-[var(--edge-text-secondary)]"
    : "text-[10px] text-[var(--edge-text-secondary)]";

  const alignClass = align === "center" ? "text-center" : "";

  return (
    <div data-testid={testId} className={`${alignClass} ${className}`.trim()}>
      <div className={`flex items-center gap-1 ${align === "center" ? "justify-center" : ""} ${labelClass}`}>
        <span>{label}</span>
        {help ? (
          <EdgeHelpIcon content={help} ariaLabel={helpAriaLabel ?? `${label} help`} />
        ) : null}
      </div>
      <div
        className={`mt-0.5 text-sm font-semibold tabular-nums text-[var(--edge-text-strong)] ${tone ? toneTextClass(tone) : ""} ${valueClassName}`.trim()}
      >
        {value}
      </div>
    </div>
  );
}
