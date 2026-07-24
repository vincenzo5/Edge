"use client";

import { Suspense } from "react";

import ModuleRouteTracker from "../home/ModuleRouteTracker";
import { CopilotPanel } from "./CopilotPanel";
import { CopilotRuntimeProviders } from "./CopilotRuntimeProviders";
import { CopilotThreadUrlFocus } from "./CopilotThreadUrlFocus";

export default function CopilotModuleShell() {
  return (
    <div
      data-testid="copilot-page"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <ModuleRouteTracker module="copilot" />
      <CopilotRuntimeProviders>
        <Suspense fallback={null}>
          <CopilotThreadUrlFocus />
        </Suspense>
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CopilotPanel variant="page" />
        </main>
      </CopilotRuntimeProviders>
    </div>
  );
}
