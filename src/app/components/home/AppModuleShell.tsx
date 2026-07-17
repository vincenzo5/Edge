"use client";

import type { HTMLAttributes, ReactNode, Ref } from "react";
import { AccountAliasesProvider } from "../AccountAliasesProvider";
import { AccountProvider } from "../AccountProvider";
import AppTopHeader from "./AppTopHeader";

type Props = {
  children: ReactNode;
  testId?: string;
  shellRef?: Ref<HTMLDivElement>;
  headerCenter?: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

export default function AppModuleShell({
  children,
  testId,
  shellRef,
  headerCenter,
  className,
  ...rest
}: Props) {
  return (
    <AccountProvider>
      <AccountAliasesProvider>
        <div
          ref={shellRef}
          data-testid={testId}
          className={`flex h-screen min-h-0 flex-col overflow-hidden bg-[var(--edge-background)]${className ? ` ${className}` : ""}`}
          {...rest}
        >
          <AppTopHeader centerSlot={headerCenter} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </AccountAliasesProvider>
    </AccountProvider>
  );
}
