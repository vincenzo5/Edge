"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAppActions } from "../AppActionsContext";
import { useCopilotThread } from "./useCopilotThread";

export type OpenAnnotationInChatOptions = {
  messageId?: string;
  threadId?: string;
  rationale?: string;
};

export type CopilotContextValue = ReturnType<typeof useCopilotThread> & {
  focusMessageId: string | null;
  fallbackRationale: string | null;
  focusMessage: (messageId: string) => void;
  clearFocus: () => void;
  openAnnotationInChat: (options: OpenAnnotationInChatOptions) => void;
};

const CopilotContext = createContext<CopilotContextValue | null>(null);

export function CopilotProvider({ children }: { children: ReactNode }) {
  const appActions = useAppActions();
  const thread = useCopilotThread();
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
    [appActions, thread],
  );

  const value = useMemo(
    () => ({
      ...thread,
      focusMessageId,
      fallbackRationale,
      focusMessage,
      clearFocus,
      openAnnotationInChat,
    }),
    [
      thread,
      focusMessageId,
      fallbackRationale,
      focusMessage,
      clearFocus,
      openAnnotationInChat,
    ],
  );

  return (
    <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>
  );
}

export function useCopilot(): CopilotContextValue | null {
  return useContext(CopilotContext);
}
