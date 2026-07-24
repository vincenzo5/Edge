"use client";

import type { ReactNode } from "react";
import { fieldClass } from "./styles";

type Props = {
  children: ReactNode;
  className?: string;
  widthClass?: string;
};

export function compactSearchFieldClass(extra = ""): string {
  // Pill silhouette — fully rounded ends instead of the shared field's sm radius.
  const field = fieldClass({ density: "compact" })
    .replace("rounded-[var(--edge-radius-sm)]", "rounded-full")
    .replace("px-[var(--edge-space-2)]", "pl-3 pr-9");
  return `edge-focus-ring w-full ${field} bg-transparent ${extra}`.trim();
}

export function CompactSearchIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export default function CompactSearchFieldShell({
  children,
  className = "",
  widthClass = "w-28 sm:w-36",
}: Props) {
  return (
    <div className={`relative ${widthClass} ${className}`.trim()}>
      {children}
      <span
        className="pointer-events-none absolute inset-y-0 right-1 inline-flex items-center"
        aria-hidden
      >
        <span className="inline-flex h-5 w-5 items-center justify-center text-[var(--edge-text-muted)]">
          <CompactSearchIcon />
        </span>
      </span>
    </div>
  );
}
