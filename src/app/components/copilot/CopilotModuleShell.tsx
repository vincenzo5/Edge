"use client";

import AppModuleShell from "../home/AppModuleShell";
import ModuleRouteTracker from "../home/ModuleRouteTracker";
import { CopilotPanel } from "./CopilotPanel";
import { CopilotRuntimeProviders } from "./CopilotRuntimeProviders";

export default function CopilotModuleShell() {
  return (
    <AppModuleShell testId="copilot-page">
      <ModuleRouteTracker module="copilot" />
      <CopilotRuntimeProviders>
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CopilotPanel variant="page" />
        </main>
      </CopilotRuntimeProviders>
    </AppModuleShell>
  );
}
