"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { useAppActions } from "../AppActionsContext";
import { useCopilotThread } from "./useCopilotThread";

export type OpenAnnotationInChatOptions = {
  messageId?: string;
  threadId?: string;
  rationale?: string;
};

export type CopilotActionsContextValue = {
  focusMessageId: string | null;
  fallbackRationale: string | null;
  focusMessage: (messageId: string) => void;
  clearFocus: () => void;
  openAnnotationInChat: (options: OpenAnnotationInChatOptions) => void;
};

export type CopilotContextValue = ReturnType<typeof useCopilotThread> &
  CopilotActionsContextValue;

type CopilotThreadHandle = ReturnType<typeof useCopilotThread>;

const CopilotActionsContext = createContext<CopilotActionsContextValue | null>(null);
export { CopilotActionsContext };

const CopilotThreadContext = createContext<CopilotThreadHandle | null>(null);

function CopilotThreadHost({
  threadRef,
  children,
}: {
  threadRef: MutableRefObject<CopilotThreadHandle | null>;
  children: ReactNode;
}) {
  const thread = useCopilotThread();
  threadRef.current = thread;
  return (
    <CopilotThreadContext.Provider value={thread}>{children}</CopilotThreadContext.Provider>
  );
}

export function CopilotProvider({ children }: { children: ReactNode }) {
  const appActions = useAppActions();
  const threadRef = useRef<CopilotThreadHandle | null>(null);
  const [focusMessageId, setFocusMessageId] = useState<string | null>(null);
  const [fallbackRationale, setFallbackRationale] = useState<string | null>(null);

  const focusMessage = useCallback((messageId: string) => {
    setFocusMessageId(messageId);
    setFallbackRationale(null);
  }, []);

  const clearFocus = useCallback(() => {
    setFocusMessageId(null);
    setFallbackRationale(null);
  }, []);

  const openAnnotationInChat = useCallback(
    (options: OpenAnnotationInChatOptions) => {
      appActions?.setSidebarPanel("copilot");

      void (async () => {
        const thread = threadRef.current;
        if (!thread) return;

        let activeMessages = thread.messages;
        if (options.threadId && options.threadId !== thread.threadId) {
          const loadedMessages = await thread.switchThread(options.threadId);
          if (loadedMessages) {
            activeMessages = loadedMessages;
          }
        }

        if (options.messageId) {
          const hasMessage = activeMessages.some(
            (message) => message.id === options.messageId,
          );
          if (hasMessage) {
            setFocusMessageId(options.messageId);
            setFallbackRationale(null);
            return;
          }
        }

        setFocusMessageId(null);
        setFallbackRationale(options.rationale?.trim() || null);
      })();
    },
    [appActions],
  );

  const actionsValue = useMemo<CopilotActionsContextValue>(
    () => ({
      focusMessageId,
      fallbackRationale,
      focusMessage,
      clearFocus,
      openAnnotationInChat,
    }),
    [focusMessageId, fallbackRationale, focusMessage, clearFocus, openAnnotationInChat],
  );

  return (
    <CopilotActionsContext.Provider value={actionsValue}>
      <CopilotThreadHost threadRef={threadRef}>{children}</CopilotThreadHost>
    </CopilotActionsContext.Provider>
  );
}

export function useCopilotActions(): CopilotActionsContextValue | null {
  return useContext(CopilotActionsContext);
}

export function useCopilotThreadState(): ReturnType<typeof useCopilotThread> | null {
  return useContext(CopilotThreadContext);
}

/** Full Copilot state for panel/composer consumers. */
export function useCopilot(): CopilotContextValue {
  const thread = useCopilotThreadState();
  const actions = useCopilotActions();
  if (!thread || !actions) {
    throw new Error("useCopilot must be used within CopilotProvider");
  }
  return { ...thread, ...actions };
}
