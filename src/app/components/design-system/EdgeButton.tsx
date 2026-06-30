"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { headerButtonClass, primaryButtonClass } from "./styles";
import type { Theme } from "@/lib/chartConfig";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  theme?: Theme;
  active?: boolean;
  variant?: "chrome" | "primary";
  children: ReactNode;
};

export default function EdgeButton({
  theme = "dark",
  active,
  variant = "chrome",
  disabled,
  className = "",
  children,
  ...rest
}: Props) {
  const styleClass =
    variant === "primary"
      ? primaryButtonClass(theme, disabled)
      : headerButtonClass(theme, active, disabled);

  return (
    <button
      type="button"
      disabled={disabled}
      className={`${styleClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
