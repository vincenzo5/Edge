"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { headerButtonClass } from "./styles";
import type { Theme } from "@/lib/chartConfig";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  theme?: Theme;
  active?: boolean;
  children: ReactNode;
};

export default function EdgeButton({
  theme = "dark",
  active,
  disabled,
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`${headerButtonClass(theme, active, disabled)} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
