"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { headerButtonClass, primaryButtonClass, secondaryButtonClass } from "./styles";
import type { Theme } from "@/lib/chartConfig";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  theme?: Theme;
  active?: boolean;
  variant?: "chrome" | "primary" | "secondary";
  children: ReactNode;
};

const EdgeButton = forwardRef<HTMLButtonElement, Props>(function EdgeButton(
  {
    theme = "dark",
    active,
    variant = "chrome",
    disabled,
    className = "",
    children,
    ...rest
  },
  ref,
) {
  const styleClass =
    variant === "primary"
      ? primaryButtonClass(theme, disabled)
      : variant === "secondary"
        ? secondaryButtonClass(theme, active, disabled)
        : headerButtonClass(theme, active, disabled);

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      className={`${styleClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
});

export default EdgeButton;
