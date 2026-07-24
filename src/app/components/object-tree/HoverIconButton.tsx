import type { ReactNode } from "react";
import { headerIconButtonClass } from "../design-system/styles";

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
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`${headerIconButtonClass("dark")} ${className}`}
    >
      {children}
    </button>
  );
}
