"use client";

import type { ReactNode } from "react";
import EdgeSpinner from "./EdgeSpinner";

type Props = {
  label: string;
  description?: ReactNode;
  busy?: boolean;
  spinnerSize?: "xs" | "sm" | "md";
  showSpinner?: boolean;
  variant?: "inline" | "banner" | "panel";
  trailing?: ReactNode;
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
};

const variantClass: Record<NonNullable<Props["variant"]>, string> = {
  inline: "flex items-center gap-3 px-3 py-2.5",
  banner: "flex items-center gap-3 border-b border-[var(--edge-border-subtle)] px-3 py-2.5",
  panel:
    "flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-md border border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)]/40 px-4 py-8",
};

export default function EdgeStatusRegion({
  label,
  description,
  busy = true,
  spinnerSize = "sm",
  showSpinner = true,
  variant = "inline",
  trailing,
  children,
  className = "",
  "data-testid": testId,
}: Props) {
  const isPanel = variant === "panel";

  return (
    <div
      data-testid={testId}
      role="status"
      aria-live="polite"
      aria-busy={busy || undefined}
      aria-label={label}
      className={`${variantClass[variant]} ${className}`.trim()}
    >
      {showSpinner ? (
        <EdgeSpinner
          size={spinnerSize}
          data-testid={testId ? `${testId}-spinner` : undefined}
        />
      ) : null}
      <div className={isPanel ? "text-center" : "min-w-0 flex-1"}>
        <div
          className={`truncate font-medium text-[var(--edge-text-strong)] ${
            isPanel ? "text-xs" : "text-xs"
          }`}
          data-testid={testId ? `${testId}-label` : undefined}
        >
          {label}
        </div>
        {description ? (
          <div className="mt-0.5 text-[10px] text-[var(--edge-text-muted)]">{description}</div>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
      {children}
    </div>
  );
}
