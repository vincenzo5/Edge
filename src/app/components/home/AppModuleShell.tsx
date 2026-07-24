"use client";

import type { HTMLAttributes, ReactNode, Ref } from "react";
import AppChromeProviders from "./AppChromeProviders";
import AppTopHeader from "./AppTopHeader";
import { AppContextMenuProvider } from "./AppContextMenuProvider";

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
  const shellClassName = `flex h-screen min-h-0 flex-col overflow-hidden bg-[var(--edge-background)]${className ? ` ${className}` : ""}`;

  return (
    <AppChromeProviders>
      <AppContextMenuProvider
        ref={shellRef}
        data-testid={testId}
        className={shellClassName}
        {...rest}
      >
        <AppTopHeader centerSlot={headerCenter} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </AppContextMenuProvider>
    </AppChromeProviders>
  );
}
