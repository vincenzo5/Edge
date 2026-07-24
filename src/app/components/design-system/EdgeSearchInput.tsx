"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { clearButtonClass, searchInputShellClass, type FieldDensity } from "./styles";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  leadingIcon?: ReactNode;
  trailing?: ReactNode;
  shellClassName?: string;
  density?: FieldDensity;
  invalid?: boolean;
  loading?: boolean;
  onClear?: () => void;
  clearLabel?: string;
};

const EdgeSearchInput = forwardRef<HTMLInputElement, Props>(function EdgeSearchInput(
  {
    leadingIcon,
    trailing,
    shellClassName = "",
    className = "",
    density = "standard",
    invalid = false,
    loading = false,
    disabled,
    onClear,
    clearLabel = "Clear search",
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    ...rest
  },
  ref,
) {
  const shellHeight =
    density === "compact"
      ? "h-[var(--edge-control-height-compact)] px-[var(--edge-space-2)]"
      : "";
  const showClear = Boolean(onClear && rest.value && String(rest.value).length > 0);

  return (
    <div
      className={`${searchInputShellClass()} ${shellHeight} ${invalid ? "border-[var(--edge-negative)]" : ""} ${disabled ? "opacity-40" : ""} ${shellClassName}`.trim()}
    >
      {leadingIcon}
      <input
        ref={ref}
        type="text"
        disabled={disabled}
        aria-busy={loading || undefined}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={`min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[var(--edge-text-muted)] disabled:cursor-not-allowed ${className}`.trim()}
        {...rest}
      />
      {showClear ? (
        <button
          type="button"
          className={clearButtonClass(disabled)}
          aria-label={clearLabel}
          disabled={disabled}
          onClick={onClear}
        >
          ×
        </button>
      ) : null}
      {trailing}
    </div>
  );
});

export default EdgeSearchInput;
