import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/copilot",
}));

vi.mock("../AiSessionBridge", () => ({
  default: () => null,
}));

import CopilotModuleShell from "./CopilotModuleShell";
import * as copilotThreadsClient from "@/lib/persistence/client/copilotThreadsClient";

const THREAD_ID = "11111111-1111-4111-8111-111111111111";

describe("CopilotModuleShell", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(copilotThreadsClient, "hydrateCopilotThreadsState").mockResolvedValue({
      activeThreadId: THREAD_ID,
      title: "New chat",
      modelId: "x-ai/grok-4.5",
      messages: [],
      threads: [
        {
          id: THREAD_ID,
          title: "New chat",
          schemaVersion: 1,
          syncRevision: 1,
          updatedAt: "2026-07-22T12:00:00.000Z",
          messageCount: 0,
        },
      ],
      syncRevision: 1,
    });
    vi.spyOn(copilotThreadsClient, "saveCopilotThreadState").mockResolvedValue({
      syncRevision: 1,
      title: "New chat",
    });
    vi.spyOn(copilotThreadsClient, "createCopilotThreadState").mockResolvedValue({
      threadId: "22222222-2222-4222-8222-222222222222",
      syncRevision: 1,
      title: "New chat",
      modelId: "x-ai/grok-4.5",
    });
    vi.spyOn(copilotThreadsClient, "loadCopilotThread").mockResolvedValue(null);
    vi.spyOn(copilotThreadsClient, "deleteCopilotThreadState").mockResolvedValue(undefined);
    vi.spyOn(copilotThreadsClient, "renameCopilotThreadState").mockResolvedValue({
      syncRevision: 2,
      title: "Renamed thread",
    });
  });

  it("renders standalone page shell and Copilot panel", async () => {
    render(<CopilotModuleShell />);

    expect(screen.getByTestId("copilot-page")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Copilot" })).toBeNull();

    await waitFor(() => {
      expect(screen.getByTestId("copilot-prompt-library")).toBeTruthy();
    });
    expect(screen.getByTestId("copilot-panel")).toHaveAttribute(
      "data-copilot-shell-variant",
      "page",
    );
  });
});
