"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { headerIconButtonClass } from "./styles";
import type { Theme } from "@/lib/chartConfig";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  theme?: Theme;
  active?: boolean;
  /** When true, sets aria-pressed for toggle semantics. */
  pressed?: boolean;
  children: ReactNode;
  /** compact = 32px; standard = 36px */
  size?: "compact" | "standard";
};

const EdgeIconButton = forwardRef<HTMLButtonElement, Props>(function EdgeIconButton(
  {
    theme = "dark",
    active,
    pressed,
    disabled,
    size = "compact",
    className = "",
    children,
    ...rest
  },
  ref,
) {
  const isPressed = pressed ?? active;
  const sizeClass =
    size === "standard"
      ? "h-[var(--edge-control-height-standard)] w-[var(--edge-control-height-standard)]"
      : "h-[var(--edge-control-height-compact)] w-[var(--edge-control-height-compact)]";
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-pressed={isPressed ? true : undefined}
      className={`edge-icon-button edge-focus-ring ${headerIconButtonClass(theme, active, disabled)} ${sizeClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
});

export default EdgeIconButton;
