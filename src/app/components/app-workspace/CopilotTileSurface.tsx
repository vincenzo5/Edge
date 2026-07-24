"use client";

import { CopilotPanel } from "../copilot/CopilotPanel";
import { CopilotRuntimeProviders } from "../copilot/CopilotRuntimeProviders";

type Props = {
  tileId: string;
};

export default function CopilotTileSurface({ tileId }: Props) {
  return (
    <CopilotRuntimeProviders>
      <div
        className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
        data-testid="copilot-tile-surface"
        data-workspace-copilot-tile={tileId}
      >
        <CopilotPanel variant="tile" />
      </div>
    </CopilotRuntimeProviders>
  );
}
