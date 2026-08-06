"use client";

import type { ReactNode } from "react";
import {
  annotationTextClass,
  borderLegendLabelClass,
  borderLegendSurfaceClass,
  type BorderLegendSurface,
} from "./styles";

type Props = {
  label: ReactNode;
  labelId: string;
  labelSurface?: BorderLegendSurface;
  className?: string;
  /** Stretch control to the full width of the parent (form fields). Default shrink-to-fit (toolbar triggers). */
  fullWidth?: boolean;
  children: ReactNode;
};

export default function EdgeBorderLabeledControl({
  label,
  labelId,
  labelSurface = "panel",
  className = "",
  fullWidth = false,
  children,
}: Props) {
  const outerClass = fullWidth
    ? "relative flex w-full overflow-visible pt-[5px]"
    : "relative inline-flex overflow-visible pt-[5px]";
  const innerClass = fullWidth
    ? "relative flex w-full min-w-0 flex-col"
    : "relative inline-flex min-w-0";

  return (
    // pt reserves half the annotation label so the floating legend stays inside the layout box
    <div className={`${outerClass} ${className}`.trim()}>
      <div className={innerClass}>
        <span
          id={labelId}
          className={`pointer-events-none absolute left-[var(--edge-space-2)] top-0 z-[1] -translate-y-1/2 px-[var(--edge-space-1)] ${annotationTextClass()} text-[var(--edge-text-secondary)] ${borderLegendSurfaceClass(labelSurface)} ${borderLegendLabelClass()}`}
        >
          {label}
        </span>
        {children}
      </div>
    </div>
  );
}

export type { BorderLegendSurface };
