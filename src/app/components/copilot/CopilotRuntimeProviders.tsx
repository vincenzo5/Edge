"use client";

import { useMemo, type ReactNode } from "react";
import { AppActionsProvider } from "../AppActionsContext";
import { AiToolsProvider } from "../AiToolsProvider";
import AiSessionBridge from "../AiSessionBridge";
import { CopilotProvider } from "./CopilotContext";
import { createStubAppActions } from "@/lib/copilot/stubAppActions";

type Props = {
  children: ReactNode;
};

export function CopilotRuntimeProviders({ children }: Props) {
  const appActions = useMemo(() => createStubAppActions(), []);

  return (
    <AppActionsProvider value={appActions}>
      <AiToolsProvider>
        <CopilotProvider>
          <AiSessionBridge />
          {children}
        </CopilotProvider>
      </AiToolsProvider>
    </AppActionsProvider>
  );
}
