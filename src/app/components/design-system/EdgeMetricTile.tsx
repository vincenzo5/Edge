"use client";

import type { ReactNode } from "react";
import Tooltip from "@/app/components/Tooltip";
import { toneTextClass, type EdgeTone } from "@/lib/design-system/edge";

type Props = {
  label: string;
  value: ReactNode;
  help?: string;
  helpAriaLabel?: string;
  tone?: EdgeTone;
  variant?: "plain" | "bordered";
  labelUppercase?: boolean;
  valueClassName?: string;
  className?: string;
  "data-testid"?: string;
};

function MetricHelpIcon({
  content,
  ariaLabel,
}: {
  content: string;
  ariaLabel: string;
}) {
  return (
    <Tooltip content={content} theme="dark" side="top" portaled>
      <span
        className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-[var(--edge-border)] text-[9px] leading-none text-[var(--edge-text-secondary)]"
        aria-label={ariaLabel}
        tabIndex={0}
      >
        i
      </span>
    </Tooltip>
  );
}

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
          <MetricHelpIcon content={help} ariaLabel={helpAriaLabel ?? `${label} help`} />
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
