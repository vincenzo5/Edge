import type { ReactNode } from "react";

export const ICON_SIZE = 14;

export function HoverIconButton({
  title,
  onClick,
  className = "",
  children,
}: {
  title: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--edge-radius-xs)] text-[var(--edge-text-muted)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)] ${className}`}
    >
      {children}
    </button>
  );
}
