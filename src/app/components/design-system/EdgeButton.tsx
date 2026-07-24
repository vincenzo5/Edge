"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import EdgeSpinner from "./EdgeSpinner";
import {
  destructiveButtonClass,
  headerButtonClass,
  linkActionClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./styles";
import type { Theme } from "@/lib/chartConfig";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  theme?: Theme;
  active?: boolean;
  variant?: "chrome" | "primary" | "secondary" | "destructive" | "link";
  loading?: boolean;
  children: ReactNode;
};

const EdgeButton = forwardRef<HTMLButtonElement, Props>(function EdgeButton(
  {
    theme = "dark",
    active,
    variant = "chrome",
    disabled,
    loading = false,
    className = "",
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const styleClass =
    variant === "primary"
      ? primaryButtonClass(theme, isDisabled)
      : variant === "secondary"
        ? secondaryButtonClass(theme, active, isDisabled)
        : variant === "destructive"
          ? destructiveButtonClass(theme, isDisabled)
          : variant === "link"
            ? linkActionClass(isDisabled)
            : headerButtonClass(theme, active, isDisabled);

  return (
    <button
      ref={ref}
      type="button"
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`${styleClass} ${className}`.trim()}
      {...rest}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <EdgeSpinner size="sm" />
          <span>{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
});

export default EdgeButton;
