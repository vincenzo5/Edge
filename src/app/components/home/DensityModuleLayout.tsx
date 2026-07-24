"use client";

import type { ReactNode } from "react";

import AiSessionBridge from "../AiSessionBridge";
import AppChromeProviders from "./AppChromeProviders";
import AppTopHeader from "./AppTopHeader";
import { AppContextMenuProvider } from "./AppContextMenuProvider";
import { HeaderCenterSlotProvider, useHeaderCenterSlot } from "./HeaderCenterSlot";

const DENSITY_SHELL_CLASS =
  "flex h-screen min-h-0 flex-col overflow-hidden bg-[var(--edge-background)]";

function DensityTopHeader() {
  const centerSlot = useHeaderCenterSlot();
  return <AppTopHeader centerSlot={centerSlot ?? undefined} />;
}

function DensityShellFrame({ children }: { children: ReactNode }) {
  return (
    <AppContextMenuProvider className={DENSITY_SHELL_CLASS}>
      <AiSessionBridge />
      <DensityTopHeader />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </AppContextMenuProvider>
  );
}

/** Persistent chrome for Talk / Board / Desk density routes — survives soft navigation. */
export default function DensityModuleLayout({ children }: { children: ReactNode }) {
  return (
    <AppChromeProviders>
      <HeaderCenterSlotProvider>
        <DensityShellFrame>{children}</DensityShellFrame>
      </HeaderCenterSlotProvider>
    </AppChromeProviders>
  );
}
