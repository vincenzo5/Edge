"use client";

import type { ReactNode } from "react";
import {
  annotationTextClass,
  borderLegendLabelClass,
  borderLegendSurfaceClass,
  type BorderLegendSurface,
} from "./styles";

type Props = {
  label: string;
  labelId: string;
  labelSurface?: BorderLegendSurface;
  className?: string;
  children: ReactNode;
};

export default function EdgeBorderLabeledControl({
  label,
  labelId,
  labelSurface = "panel",
  className = "",
  children,
}: Props) {
  return (
    // pt reserves half the annotation label so the floating legend stays inside the layout box
    <div className={`relative inline-flex overflow-visible pt-[5px] ${className}`.trim()}>
      <div className="relative inline-flex min-w-0">
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
