"use client";

import { useMemo, type ReactNode } from "react";
import { AppActionsProvider } from "../AppActionsContext";
import { AiToolsProvider } from "../AiToolsProvider";
import { CopilotProvider } from "./CopilotContext";
import { createStubAppActions } from "@/lib/copilot/stubAppActions";

type Props = {
  children: ReactNode;
};

/** Density layout mounts `AiSessionBridge` once for Talk/Board/Desk — do not nest another here. */
export function CopilotRuntimeProviders({ children }: Props) {
  const appActions = useMemo(() => createStubAppActions(), []);

  return (
    <AppActionsProvider value={appActions}>
      <AiToolsProvider>
        <CopilotProvider>{children}</CopilotProvider>
      </AiToolsProvider>
    </AppActionsProvider>
  );
}
