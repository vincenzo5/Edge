"use client";

import { useRef, useState } from "react";
import EdgeAnchoredPopover from "./EdgeAnchoredPopover";
import EdgeMenuItem from "./EdgeMenuItem";
import { annotationTextClass } from "./styles";
import type { EdgeSelectOption } from "./EdgeSelect";

export type EdgeMicroSelectProps<T extends string = string> = {
  value: T;
  options: EdgeSelectOption<T>[];
  onChange: (value: T) => void;
  "aria-label": string;
  disabled?: boolean;
  testId?: string;
  className?: string;
  align?: "start" | "end";
};

function MicroChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden
      className={`shrink-0 text-[var(--edge-text-muted)] motion-safe:transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M2 3.5L5 6.5L8 3.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Annotation-sized dropdown trigger for dense form chrome (trade ticket modifiers). */
export default function EdgeMicroSelect<T extends string = string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
  disabled = false,
  testId,
  className = "",
  align = "start",
}: EdgeMicroSelectProps<T>) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.value === value);
  const displayLabel = selected?.label ?? value;

  const close = () => setOpen(false);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-testid={testId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        className={`edge-focus-ring inline-flex h-[18px] max-w-full items-center gap-0.5 rounded-[var(--edge-radius-sm)] border border-transparent px-1 ${annotationTextClass()} text-[var(--edge-text-secondary)] motion-safe:transition-[background-color,border-color,color] motion-safe:duration-[var(--edge-motion-fast)] hover:border-[var(--edge-border-subtle)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)] disabled:cursor-not-allowed disabled:opacity-40 ${className}`.trim()}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
      >
        <span className="min-w-0 truncate leading-none">{displayLabel}</span>
        <MicroChevron open={open} />
      </button>
      <EdgeAnchoredPopover
        open={open}
        anchorRef={triggerRef}
        onClose={close}
        align={align}
        minWidth={96}
        role="menu"
        enableMenuKeyboardNav
      >
        {options.map((option) => (
          <EdgeMenuItem
            key={option.value}
            label={option.label}
            selected={option.value === value}
            disabled={option.disabled}
            testId={testId ? `${testId}-option-${option.value}` : undefined}
            onClick={() => {
              onChange(option.value);
              close();
            }}
          />
        ))}
      </EdgeAnchoredPopover>
    </>
  );
}
