"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentStreamEvent, ChatMessage } from "@/lib/ai/agent/contracts";
import { toArtifactHint, type ResearchArtifactHint } from "@/lib/research/artifactHint";
import {
  EDGE_AI_DEFAULT_MODEL_FALLBACK,
  resolveAllowedModelId,
} from "@/lib/ai/model/allowlist";
import { resolveEnabledModelId, subscribeEnabledModels } from "@/lib/ai/model/enabledModelsStore";
import {
  createCopilotThreadState,
  DEFAULT_THREAD_TITLE,
  deleteCopilotThreadState,
  hydrateCopilotThreadsState,
  loadCopilotThread,
  renameCopilotThreadState,
  saveCopilotThreadState,
} from "@/lib/persistence/client/copilotThreadsClient";
import { hydrateMessagesFromPersist } from "@/lib/copilot/copilotThreadRedact";
import type { CopilotThreadSummary } from "@/lib/persistence/schemas/copilotThreads";
import {
  executeConfirmedTool,
  summarizeConfirmedToolResult,
} from "./confirmToolExecution";
import { selectChatRequestMessages } from "./selectChatRequestMessages";
import { streamChat } from "./streamChat";
import { resolveCopilotAttachmentDataUrl } from "@/lib/persistence/client/copilotAttachmentsClient";
import type { CopilotAttachmentMimeType, CopilotAttachmentSource } from "@/lib/copilot/attachmentValidation";

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

function createMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toApiMessages(
  messages: CopilotMessage[],
  attachmentDataUrls?: Map<string, string>,
): ChatMessage[] {
  return selectChatRequestMessages(messages, { attachmentDataUrls });
}

async function buildAttachmentDataUrlMap(
  attachments: CopilotMessageAttachment[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const attachment of attachments) {
    const dataUrl = await resolveCopilotAttachmentDataUrl(attachment.id);
    if (dataUrl) {
      map.set(attachment.id, dataUrl);
    }
  }
  return map;
}

function applyStreamEvent(
  message: CopilotMessage,
  event: AgentStreamEvent,
): CopilotMessage {
  switch (event.type) {
    case "text-delta":
      return {
        ...message,
        content: message.content + event.delta,
      };
    case "tool-call": {
      const existing = message.toolSteps.find((step) => step.callId === event.callId);
      if (existing) return message;
      return {
        ...message,
        toolSteps: [
          ...message.toolSteps,
          {
            callId: event.callId,
            name: event.name,
            status: "running",
          },
        ],
      };
    }
    case "tool-result":
      return {
        ...message,
        toolSteps: message.toolSteps.map((step) =>
          step.callId === event.callId
            ? step.status === "pending-confirm"
              ? { ...step, summary: event.summary, artifactHint: event.artifactHint }
              : {
                  ...step,
                  status: event.ok ? "done" : "error",
                  summary: event.summary,
                  artifactHint: event.artifactHint,
                }
            : step,
        ),
      };
    case "confirm-required":
      return {
        ...message,
        toolSteps: message.toolSteps.map((step) =>
          step.callId === event.callId
            ? {
                ...step,
                name: event.name,
                status: "pending-confirm",
                confirmReason: event.reason,
                confirmArguments: event.arguments ?? {},
                confirmationToken: event.confirmationToken,
                requiresClientSession: event.requiresClientSession,
                summary: undefined,
              }
            : step,
        ),
      };
    case "error":
      return {
        ...message,
        status: "error",
        error: event.message,
      };
    case "done":
      return {
        ...message,
        status: message.status === "error" ? "error" : "done",
      };
    default:
      return message;
  }
}

const PERSIST_DEBOUNCE_MS = 400;

export function useCopilotThread() {
  const [threadId, setThreadId] = useState("");
  const [title, setTitle] = useState(DEFAULT_THREAD_TITLE);
  const [modelId, setModelIdState] = useState(() => resolveEnabledModelId(EDGE_AI_DEFAULT_MODEL_FALLBACK));
  const [threads, setThreads] = useState<CopilotThreadSummary[]>([]);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [syncRevision, setSyncRevision] = useState(1);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [hydrateError, setHydrateError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<{
    threadId: string;
    title: string;
    modelId: string;
    messages: CopilotMessage[];
    syncRevision: number;
  }>({
    threadId: "",
    title: DEFAULT_THREAD_TITLE,
    modelId: EDGE_AI_DEFAULT_MODEL_FALLBACK,
    messages: [] as CopilotMessage[],
    syncRevision: 1,
  });

  useEffect(() => {
    stateRef.current = { threadId, title, modelId, messages, syncRevision };
  }, [threadId, title, modelId, messages, syncRevision]);

  const refreshThreadSummaries = useCallback(async () => {
    const hydrated = await hydrateCopilotThreadsState();
    setThreads(hydrated.threads);
    return hydrated.threads;
  }, []);

  const persistNow = useCallback(
    async (override?: {
      threadId?: string;
      title?: string;
      modelId?: string;
      messages?: CopilotMessage[];
      syncRevision?: number;
    }) => {
      const current = stateRef.current;
      const activeThreadId = override?.threadId ?? current.threadId;
      if (!activeThreadId) return;

      const result = await saveCopilotThreadState({
        threadId: activeThreadId,
        title: override?.title ?? current.title,
        modelId: override?.modelId ?? current.modelId,
        messages: override?.messages ?? current.messages,
        syncRevision: override?.syncRevision ?? current.syncRevision,
      });

      setSyncRevision(result.syncRevision);
      setTitle(result.title);
      setThreads(await refreshThreadSummaries());
    },
    [refreshThreadSummaries],
  );

  const schedulePersist = useCallback(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      void persistNow();
    }, PERSIST_DEBOUNCE_MS);
  }, [persistNow]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const hydrated = await hydrateCopilotThreadsState();
        if (cancelled) return;
        setThreadId(hydrated.activeThreadId);
        setTitle(hydrated.title);
        setModelIdState(resolveEnabledModelId(hydrated.modelId));
        setMessages(hydrated.messages);
        setSyncRevision(hydrated.syncRevision);
        setThreads(hydrated.threads);
        setHydrateError(null);
      } catch (error) {
        if (cancelled) return;
        setHydrateError(
          error instanceof Error ? error.message : "Unable to load Copilot history.",
        );
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setMessages((current) => {
      const last = current[current.length - 1];
      if (!last || last.role !== "assistant" || last.status !== "streaming") {
        return current;
      }
      const next = [
        ...current.slice(0, -1),
        {
          ...last,
          status: "cancelled" as const,
          error: last.content ? undefined : "Cancelled",
        },
      ];
      schedulePersist();
      return next;
    });
  }, [schedulePersist]);

  const switchThread = useCallback(
    async (nextThreadId: string) => {
      if (nextThreadId === threadId || isStreaming) {
        return stateRef.current.messages;
      }

      await persistNow();

      const loaded = await loadCopilotThread(nextThreadId);
      if (!loaded) {
        setHydrateError("Copilot thread not found.");
        return null;
      }

      const nextMessages = hydrateMessagesFromPersist(loaded.record.messages);
      setThreadId(nextThreadId);
      setTitle(loaded.record.title);
      setModelIdState(resolveEnabledModelId(loaded.record.modelId));
      setMessages(nextMessages);
      setSyncRevision(loaded.record.syncRevision);
      setConfigError(null);
      setHydrateError(null);
      setThreads(await refreshThreadSummaries());
      return nextMessages;
    },
    [isStreaming, persistNow, refreshThreadSummaries, threadId],
  );

  const newChat = useCallback(async () => {
    if (isStreaming) return;
    cancel();
    await persistNow();
    const created = await createCopilotThreadState({
      modelId: resolveEnabledModelId(),
    });
    setThreadId(created.threadId);
    setTitle(created.title);
    setModelIdState(resolveEnabledModelId(created.modelId));
    setMessages([]);
    setSyncRevision(created.syncRevision);
    setConfigError(null);
    setHydrateError(null);
    setThreads(await refreshThreadSummaries());
  }, [cancel, isStreaming, persistNow, refreshThreadSummaries]);

  const renameThread = useCallback(
    async (nextTitle: string) => {
      const trimmed = nextTitle.trim();
      if (!trimmed || !threadId) return;
      const result = await renameCopilotThreadState({
        threadId,
        title: trimmed,
        messages,
        syncRevision,
        modelId,
      });
      setTitle(result.title);
      setSyncRevision(result.syncRevision);
      setThreads(await refreshThreadSummaries());
    },
    [messages, modelId, syncRevision, threadId, refreshThreadSummaries],
  );

  const deleteThread = useCallback(
    async (targetThreadId: string) => {
      if (isStreaming) return;
      await deleteCopilotThreadState(targetThreadId);

      if (targetThreadId === threadId) {
        const summaries = await refreshThreadSummaries();
        if (summaries.length > 0) {
          await switchThread(summaries[0]!.id);
          return;
        }
        const created = await createCopilotThreadState({
          modelId: resolveEnabledModelId(),
        });
        setThreadId(created.threadId);
        setTitle(created.title);
        setModelIdState(resolveEnabledModelId(created.modelId));
        setMessages([]);
        setSyncRevision(created.syncRevision);
        setThreads(await refreshThreadSummaries());
        return;
      }

      setThreads(await refreshThreadSummaries());
    },
    [isStreaming, refreshThreadSummaries, switchThread, threadId],
  );

  const send = useCallback(
    async (
      text: string,
      workspaceSnapshot?: string,
      attachments: CopilotMessageAttachment[] = [],
    ) => {
      const trimmed = text.trim();
      const hasAttachments = attachments.length > 0;
      if ((!trimmed && !hasAttachments) || isStreaming || !threadId) return;

      setConfigError(null);

      const userMessage: CopilotMessage = {
        id: createMessageId(),
        role: "user",
        content: trimmed,
        ...(hasAttachments ? { attachments } : {}),
        toolSteps: [],
        status: "done",
      };

      const assistantId = createMessageId();
      const assistantMessage: CopilotMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        toolSteps: [],
        status: "streaming",
      };

      const priorMessages = messages;
      const nextMessages = [...priorMessages, userMessage, assistantMessage];
      setMessages(nextMessages);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const attachmentDataUrls = hasAttachments
        ? await buildAttachmentDataUrlMap(attachments)
        : undefined;

      const result = await streamChat(
        {
          messages: toApiMessages([...priorMessages, userMessage], attachmentDataUrls),
          threadId,
          assistantMessageId: assistantId,
          workspaceSnapshot,
          permissionMode: "write",
          modelId: stateRef.current.modelId,
        },
        {
          signal: controller.signal,
          onEvent: (event) => {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId ? applyStreamEvent(message, event) : message,
              ),
            );
          },
        },
      );

      abortRef.current = null;
      setIsStreaming(false);

      if (!result.ok) {
        if (result.error.kind === "missing_key") {
          setConfigError(result.error.message);
        }
        if (result.aborted) {
          return;
        }
        setMessages((current) => {
          const next = current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  status: "error" as const,
                  error: result.error.message,
                }
              : message,
          );
          schedulePersist();
          return next;
        });
        return;
      }

      setMessages((current) => {
        const next = current.map((message) =>
          message.id === assistantId && message.status === "streaming"
            ? { ...message, status: "done" as const }
            : message,
        );
        schedulePersist();
        return next;
      });
    },
    [isStreaming, messages, schedulePersist, threadId],
  );

  const resolveConfirm = useCallback(
    async (messageId: string, callId: string, accepted: boolean) => {
      if (!accepted) {
        setMessages((current) => {
          const next = current.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  toolSteps: message.toolSteps.map((step) =>
                    step.callId === callId
                      ? {
                          ...step,
                          status: "rejected" as const,
                          summary: "Rejected",
                        }
                      : step,
                  ),
                }
              : message,
          );
          schedulePersist();
          return next;
        });
        return;
      }

      const message = messages.find((entry) => entry.id === messageId);
      const step = message?.toolSteps.find((entry) => entry.callId === callId);
      if (!step || step.status !== "pending-confirm") return;

      setMessages((current) =>
        current.map((entry) =>
          entry.id === messageId
            ? {
                ...entry,
                toolSteps: entry.toolSteps.map((toolStep) =>
                  toolStep.callId === callId
                    ? { ...toolStep, status: "running", summary: "Running…" }
                    : toolStep,
                ),
              }
            : entry,
        ),
      );

      const result = await executeConfirmedTool(
        step.name,
        step.confirmArguments ?? {},
        {
          confirmationToken: step.confirmationToken ?? "",
          requiresClientSession: step.requiresClientSession,
          drawingLinkage: { threadId, messageId },
        },
      );

      setMessages((current) => {
        const next = current.map((entry) =>
          entry.id === messageId
            ? {
                ...entry,
                toolSteps: entry.toolSteps.map((toolStep) =>
                  toolStep.callId === callId
                    ? {
                        ...toolStep,
                        status: result.ok ? ("done" as const) : ("error" as const),
                        summary: summarizeConfirmedToolResult(step.name, result),
                        artifactHint: result.ok
                          ? toArtifactHint(step.name, result) ?? undefined
                          : undefined,
                      }
                    : toolStep,
                ),
              }
            : entry,
        );
        schedulePersist();
        return next;
      });
    },
    [messages, schedulePersist, threadId],
  );

  const setModelId = useCallback(
    (nextModelId: string) => {
      if (isStreaming) return;
      const resolved = resolveEnabledModelId(resolveAllowedModelId(nextModelId));
      setModelIdState(resolved);
      stateRef.current = { ...stateRef.current, modelId: resolved };
      schedulePersist();
    },
    [isStreaming, schedulePersist],
  );

  useEffect(() => {
    return subscribeEnabledModels(() => {
      setModelIdState((current) => {
        const resolved = resolveEnabledModelId(current);
        if (resolved === current) return current;
        stateRef.current = { ...stateRef.current, modelId: resolved };
        if (persistTimerRef.current) {
          clearTimeout(persistTimerRef.current);
        }
        persistTimerRef.current = setTimeout(() => {
          persistTimerRef.current = null;
          void persistNow();
        }, PERSIST_DEBOUNCE_MS);
        return resolved;
      });
    });
  }, [persistNow]);

  const regenerateLast = useCallback(
    async (workspaceSnapshot?: string) => {
      if (isStreaming || !threadId) return;

      const hasPendingConfirm = messages.some((message) =>
        message.toolSteps.some((step) => step.status === "pending-confirm"),
      );
      if (hasPendingConfirm) return;

      const lastIndex = messages.length - 1;
      const lastMessage = messages[lastIndex];
      if (
        !lastMessage ||
        lastMessage.role !== "assistant" ||
        lastMessage.status === "streaming"
      ) {
        return;
      }

      let userIndex = lastIndex - 1;
      while (userIndex >= 0 && messages[userIndex]?.role !== "user") {
        userIndex -= 1;
      }
      if (userIndex < 0) return;

      const truncated = messages.slice(0, lastIndex);

      setConfigError(null);

      const assistantId = createMessageId();
      const assistantMessage: CopilotMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        toolSteps: [],
        status: "streaming",
      };

      setMessages([...truncated, assistantMessage]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const result = await streamChat(
        {
          messages: toApiMessages(truncated),
          threadId,
          assistantMessageId: assistantId,
          workspaceSnapshot,
          permissionMode: "write",
          modelId: stateRef.current.modelId,
        },
        {
          signal: controller.signal,
          onEvent: (event) => {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId ? applyStreamEvent(message, event) : message,
              ),
            );
          },
        },
      );

      abortRef.current = null;
      setIsStreaming(false);

      if (!result.ok) {
        if (result.error.kind === "missing_key") {
          setConfigError(result.error.message);
        }
        if (result.aborted) {
          return;
        }
        setMessages((current) => {
          const next = current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  status: "error" as const,
                  error: result.error.message,
                }
              : message,
          );
          schedulePersist();
          return next;
        });
        return;
      }

      setMessages((current) => {
        const next = current.map((message) =>
          message.id === assistantId && message.status === "streaming"
            ? { ...message, status: "done" as const }
            : message,
        );
        schedulePersist();
        return next;
      });
    },
    [isStreaming, messages, schedulePersist, threadId],
  );

  return {
    threadId,
    title,
    modelId,
    threads,
    messages,
    isStreaming,
    isHydrating,
    hydrateError,
    configError,
    send,
    cancel,
    newChat,
    switchThread,
    renameThread,
    deleteThread,
    resolveConfirm,
    setModelId,
    regenerateLast,
  };
}
