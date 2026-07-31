import type { CopilotAttachmentMimeType, CopilotAttachmentSource } from "@/lib/copilot/attachmentValidation";
import type { ResearchArtifactHint } from "@/lib/research/artifactHint";
import type { CopilotThreadSummary } from "@/lib/persistence/schemas/copilotThreads";

export type CopilotDrawingLinkage = {
  threadId: string;
  messageId: string;
};

export type CopilotToolStepStatus =
  | "running"
  | "done"
  | "error"
  | "pending-confirm"
  | "rejected";

export type CopilotToolStep = {
  callId: string;
  name: string;
  status: CopilotToolStepStatus;
  summary?: string;
  confirmReason?: string;
  confirmArguments?: Record<string, unknown>;
  confirmationToken?: string;
  requiresClientSession?: boolean;
  /** In-memory only — not persisted on Copilot thread rows. */
  artifactHint?: ResearchArtifactHint;
};

export type CopilotMessageStatus = "streaming" | "done" | "error" | "cancelled";

export type CopilotMessageAttachment = {
  id: string;
  mimeType: CopilotAttachmentMimeType;
  name?: string | null;
  source?: CopilotAttachmentSource;
};

export type CopilotMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: CopilotMessageAttachment[];
  toolSteps: CopilotToolStep[];
  status?: CopilotMessageStatus;
  error?: string;
  /** In-memory stream start — not persisted on Copilot thread rows. */
  startedAtMs?: number;
  /** Frozen trace duration when the turn completes — not persisted. */
  thoughtDurationSec?: number;
};

export type CopilotThreadState = {
  threadId: string;
  title: string;
  threads: CopilotThreadSummary[];
  messages: CopilotMessage[];
  isStreaming: boolean;
  isHydrating: boolean;
  hydrateError: string | null;
  configError: string | null;
};
