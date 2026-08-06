"use client";

import Tooltip from "@/app/components/Tooltip";

type Props = {
  content: string;
  ariaLabel: string;
  side?: "bottom" | "left" | "right" | "top";
  className?: string;
};

export default function EdgeHelpIcon({
  content,
  ariaLabel,
  side = "top",
  className = "",
}: Props) {
  return (
    <Tooltip content={content} theme="dark" side={side} portaled>
      <span
        className={`inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-[var(--edge-border)] text-[9px] leading-none text-[var(--edge-text-secondary)] ${className}`.trim()}
        aria-label={ariaLabel}
        tabIndex={0}
      >
        i
      </span>
    </Tooltip>
  );
}
