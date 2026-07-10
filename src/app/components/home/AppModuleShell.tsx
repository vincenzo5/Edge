"use client";

import type { HTMLAttributes, ReactNode, Ref } from "react";
import { AccountProvider } from "../AccountProvider";
import AppTopHeader from "./AppTopHeader";
import HomeAppNav from "./HomeAppNav";

type Props = {
  children: ReactNode;
  testId?: string;
  shellRef?: Ref<HTMLDivElement>;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

export default function AppModuleShell({
  children,
  testId,
  shellRef,
  className,
  ...rest
}: Props) {
  return (
    <AccountProvider>
      <div
        ref={shellRef}
        data-testid={testId}
        className={`flex h-screen min-h-0 overflow-hidden bg-[var(--edge-background)]${className ? ` ${className}` : ""}`}
        {...rest}
      >
        <HomeAppNav />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AppTopHeader />
          {children}
        </div>
      </div>
    </AccountProvider>
  );
}
