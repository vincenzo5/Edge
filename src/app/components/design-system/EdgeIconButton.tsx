"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { headerIconButtonClass } from "./styles";
import type { Theme } from "@/lib/chartConfig";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  theme?: Theme;
  active?: boolean;
  children: ReactNode;
  size?: "sm" | "md";
};

export default function EdgeIconButton({
  theme = "dark",
  active,
  disabled,
  size = "md",
  className = "",
  children,
  ...rest
}: Props) {
  const sizeClass = size === "sm" ? "h-6 w-6" : "h-7 w-7";
  return (
    <button
      type="button"
      disabled={disabled}
      className={`edge-icon-button edge-focus-ring ${headerIconButtonClass(theme, active, disabled)} ${sizeClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
