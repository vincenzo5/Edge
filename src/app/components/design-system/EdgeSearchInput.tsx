"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { searchInputShellClass } from "./styles";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  leadingIcon?: ReactNode;
  trailing?: ReactNode;
  shellClassName?: string;
};

const EdgeSearchInput = forwardRef<HTMLInputElement, Props>(function EdgeSearchInput(
  { leadingIcon, trailing, shellClassName = "", className = "", ...rest },
  ref,
) {
  return (
    <div className={`${searchInputShellClass()} ${shellClassName}`.trim()}>
      {leadingIcon}
      <input
        ref={ref}
        type="text"
        className={`min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[var(--edge-text-muted)] ${className}`.trim()}
        {...rest}
      />
      {trailing}
    </div>
  );
});

export default EdgeSearchInput;
