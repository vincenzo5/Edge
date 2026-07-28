"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PencilIcon,
  PlusIcon,
  SettingsIcon,
} from "../chart-chrome/ChartHeaderIcons";
import { TrashIcon } from "../chart-icons/ChartToolIcons";
import { useAppActions } from "../AppActionsContext";
import { useActiveChart } from "@/app/components/ActiveChartContext";
import {
  EdgeButton,
  EdgeEmptyState,
  EdgeIconButton,
  EdgePanelHeader,
  EdgeSelect,
  EdgeStatusRegion,
} from "../design-system";
import { modelMenuSubtitle } from "@/lib/ai/model/modelMenuSubtitle";
import { modelSupportsVision } from "@/lib/ai/model/allowlist";
import { resolveEnabledVisionModelId } from "@/lib/ai/model/enabledModelsStore";
import {
  SnapshotCaptureError,
  snapshotErrorMessage,
} from "@/lib/chart/chartSnapshot";
import { CopilotComposer } from "./CopilotComposer";
import { CopilotEmptyBrand } from "./CopilotEmptyBrand";
import { CopilotHistoryRail } from "./CopilotHistoryRail";
import { CopilotEvidenceRail } from "./CopilotEvidenceRail";
import { CopilotMessageList } from "./CopilotMessageList";
import { CopilotModelSettingsModal } from "./CopilotModelSettingsModal";
import { CopilotShell, type CopilotShellVariant } from "./CopilotShell";
import { useCopilot } from "./CopilotContext";
import { useEnabledAgentModels } from "./useEnabledAgentModels";
import { useResearchEvidence } from "../research/useResearchEvidence";
import { serializeWorkspaceSnapshot } from "./workspaceSnapshotText";
import type { CopilotMessageAttachment } from "./useCopilotThread";

export type CopilotPanelVariant = CopilotShellVariant;

type Props = {
  variant?: CopilotPanelVariant;
};

export function CopilotPanel({ variant = "sidebar" }: Props) {
  const router = useRouter();
  const appActions = useAppActions();
  const activeChart = useActiveChart();
  const copilot = useCopilot();
  const enabledModels = useEnabledAgentModels();
  const { pinFromHint, isPinned } = useResearchEvidence();
  const [renameDraft, setRenameDraft] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const composerModels = useMemo(
    () =>
      enabledModels.map((model) => ({
        id: model.id,
        label: model.label,
        subtitle: modelMenuSubtitle(model),
      })),
    [enabledModels],
  );

  const handleSend = useCallback(
    (text: string, attachments: CopilotMessageAttachment[] = []) => {
      if (!appActions || !copilot) return;
      const layout = appActions.getLayout();
      const snapshot = serializeWorkspaceSnapshot(layout, appActions.isHydrated());
      void copilot.send(text, snapshot, attachments);
    },
    [appActions, copilot],
  );

  const handleRequestVisionModel = useCallback(() => {
    if (!copilot) return;
    const nextVisionModelId = resolveEnabledVisionModelId(copilot.modelId);
    if (nextVisionModelId && nextVisionModelId !== copilot.modelId) {
      copilot.setModelId(nextVisionModelId);
    }
  }, [copilot]);

  const handleCaptureChart = useCallback(async (): Promise<Blob | null> => {
    if (!activeChart?.chartCommands.canCaptureSnapshot()) {
      return null;
    }
    try {
      return await activeChart.chartCommands.captureSnapshot({ includeCrosshair: false });
    } catch (error) {
      if (error instanceof SnapshotCaptureError) {
        console.warn(snapshotErrorMessage(error.reason));
      }
      return null;
    }
  }, [activeChart]);

  const handleRegenerate = useCallback(() => {
    if (!appActions || !copilot) return;
    const layout = appActions.getLayout();
    const snapshot = serializeWorkspaceSnapshot(layout, appActions.isHydrated());
    void copilot.regenerateLast(snapshot);
  }, [appActions, copilot]);

  const handlePinArtifact = useCallback(
    (
      hint: Parameters<typeof pinFromHint>[0],
      provenance: { messageId: string; toolCallId: string },
    ) => {
      if (!copilot) return;
      pinFromHint(hint, {
        threadId: copilot.threadId,
        messageId: provenance.messageId,
        toolCallId: provenance.toolCallId,
      });
    },
    [copilot, pinFromHint],
  );

  const handleOpenEvidenceHref = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  if (!appActions || !copilot) {
    return (
      <EdgeStatusRegion data-testid="copilot-loading" label="Loading workspace…">
        <EdgeEmptyState message="Copilot needs workspace context to start." />
      </EdgeStatusRegion>
    );
  }

  if (copilot.isHydrating) {
    return (
      <EdgeStatusRegion data-testid="copilot-hydrating" label="Loading Copilot history…">
        <EdgeEmptyState message="Restoring your Copilot threads…" />
      </EdgeStatusRegion>
    );
  }

  const {
    threadId,
    title,
    modelId,
    threads,
    messages,
    isStreaming,
    hydrateError,
    configError,
    cancel,
    newChat,
    switchThread,
    renameThread,
    deleteThread,
    resolveConfirm,
    setModelId,
    focusMessageId,
    fallbackRationale,
    clearFocus,
  } = copilot;

  const threadOptions = threads.map((thread) => ({
    value: thread.id,
    label: thread.title,
  }));

  const isWideHost = variant === "page" || variant === "tile";
  const isEmpty = messages.length === 0 && !configError;
  const showHistoryRail = isWideHost && !isEmpty;
  const composerDisabled = Boolean(configError && messages.length === 0);

  const handleStartRename = () => {
    setRenameDraft(title);
    setIsRenaming(true);
  };

  const handleCommitRename = () => {
    void renameThread(renameDraft).finally(() => {
      setIsRenaming(false);
    });
  };

  const minimalTopChrome = (
    <>
      <EdgeIconButton
        type="button"
        aria-label="Copilot settings"
        title="Copilot settings"
        data-testid="copilot-settings"
        disabled={isStreaming}
        onClick={() => setSettingsOpen(true)}
      >
        <SettingsIcon />
      </EdgeIconButton>
      <EdgeIconButton
        type="button"
        aria-label="New chat"
        title="New chat"
        data-testid="copilot-new-chat"
        onClick={() => {
          clearFocus();
          void newChat();
        }}
        disabled={isStreaming}
      >
        <PlusIcon />
      </EdgeIconButton>
    </>
  );

  const activeTopChrome = (
    <EdgePanelHeader
      title="Copilot"
      actions={
        <div className="flex items-center gap-2">
          {threads.length > 0 ? (
            <EdgeSelect
              value={threadId}
              onChange={(value) => {
                clearFocus();
                void switchThread(value);
              }}
              options={threadOptions}
              variant="chip"
              density="compact"
              disabled={isStreaming}
              testId="copilot-thread-select"
              aria-label="Copilot thread"
              minWidth={140}
            />
          ) : null}
          <EdgeIconButton
            type="button"
            aria-label="Copilot settings"
            title="Copilot settings"
            data-testid="copilot-settings"
            disabled={isStreaming}
            onClick={() => setSettingsOpen(true)}
          >
            <SettingsIcon />
          </EdgeIconButton>
          <EdgeIconButton
            type="button"
            aria-label="New chat"
            title="New chat"
            data-testid="copilot-new-chat"
            onClick={() => {
              clearFocus();
              void newChat();
            }}
            disabled={isStreaming}
          >
            <PlusIcon />
          </EdgeIconButton>
          <EdgeIconButton
            type="button"
            aria-label="Rename"
            title="Rename"
            data-testid="copilot-rename"
            onClick={handleStartRename}
            disabled={isStreaming || !threadId}
          >
            <PencilIcon />
          </EdgeIconButton>
          <EdgeIconButton
            type="button"
            aria-label="Delete"
            title="Delete"
            data-testid="copilot-delete"
            onClick={() => {
              clearFocus();
              void deleteThread(threadId);
            }}
            disabled={isStreaming || !threadId}
          >
            <TrashIcon size={16} />
          </EdgeIconButton>
        </div>
      }
    />
  );

  const wideActiveTopChrome = (
    <EdgePanelHeader
      title="Copilot"
      actions={
        <div className="flex items-center gap-2">
          <EdgeIconButton
            type="button"
            aria-label="Copilot settings"
            title="Copilot settings"
            data-testid="copilot-settings"
            disabled={isStreaming}
            onClick={() => setSettingsOpen(true)}
          >
            <SettingsIcon />
          </EdgeIconButton>
          <EdgeIconButton
            type="button"
            aria-label="Rename"
            title="Rename"
            data-testid="copilot-rename"
            onClick={handleStartRename}
            disabled={isStreaming || !threadId}
          >
            <PencilIcon />
          </EdgeIconButton>
          <EdgeIconButton
            type="button"
            aria-label="Delete"
            title="Delete"
            data-testid="copilot-delete"
            onClick={() => {
              clearFocus();
              void deleteThread(threadId);
            }}
            disabled={isStreaming || !threadId}
          >
            <TrashIcon size={16} />
          </EdgeIconButton>
        </div>
      }
    />
  );

  const historyRail = showHistoryRail ? (
    <CopilotHistoryRail
      threadId={threadId}
      threads={threads}
      disabled={isStreaming}
      onNewChat={() => {
        clearFocus();
        void newChat();
      }}
      onSwitchThread={(nextThreadId) => {
        clearFocus();
        void switchThread(nextThreadId);
      }}
      onDeleteThread={(targetThreadId) => {
        clearFocus();
        void deleteThread(targetThreadId);
      }}
    />
  ) : undefined;

  const evidenceRail =
    variant === "page" && !isEmpty ? (
      <CopilotEvidenceRail onOpenHref={handleOpenEvidenceHref} />
    ) : undefined;

  const banners = (
    <>
      {isRenaming ? (
        <div
          data-testid="copilot-rename-form"
          className="flex items-center gap-2 border-b border-[var(--edge-border)] px-[var(--edge-space-3)] py-2"
        >
          <input
            data-testid="copilot-rename-input"
            className="min-w-0 flex-1 rounded border border-[var(--edge-border)] bg-[var(--edge-surface-raised)] px-2 py-1 text-sm text-[var(--edge-text-primary)]"
            value={renameDraft}
            onChange={(event) => setRenameDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleCommitRename();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setIsRenaming(false);
              }
            }}
            aria-label="Thread title"
          />
          <EdgeButton
            type="button"
            variant="secondary"
            data-testid="copilot-rename-save"
            onClick={handleCommitRename}
            disabled={!renameDraft.trim()}
          >
            Save
          </EdgeButton>
          <EdgeButton
            type="button"
            variant="link"
            data-testid="copilot-rename-cancel"
            onClick={() => setIsRenaming(false)}
          >
            Cancel
          </EdgeButton>
        </div>
      ) : null}
      {hydrateError ? (
        <div
          data-testid="copilot-hydrate-error"
          className="border-b border-[var(--edge-warning)] bg-[var(--edge-surface-raised)] px-[var(--edge-space-3)] py-2 text-xs text-[var(--edge-warning)]"
          role="alert"
        >
          {hydrateError}
        </div>
      ) : null}
      {configError && messages.length > 0 ? (
        <div
          data-testid="copilot-config-banner"
          className="border-b border-[var(--edge-warning)] bg-[var(--edge-surface-raised)] px-[var(--edge-space-3)] py-2 text-xs text-[var(--edge-warning)]"
          role="alert"
        >
          {configError}
        </div>
      ) : null}
      {fallbackRationale ? (
        <div
          data-testid="copilot-fallback-rationale"
          className="border-b border-[var(--edge-border)] bg-[var(--edge-surface-raised)] px-[var(--edge-space-3)] py-2 text-xs text-[var(--edge-text-secondary)]"
        >
          <span className="font-medium text-[var(--edge-text-primary)]">AI suggested: </span>
          {fallbackRationale}
        </div>
      ) : null}
    </>
  );

  const composer = (
    <CopilotComposer
      disabled={composerDisabled}
      isStreaming={isStreaming}
      onSend={handleSend}
      onCancel={cancel}
      placeholder={isEmpty ? "What do you want to know?" : "Ask Copilot…"}
      mode={isEmpty ? "hero" : "docked"}
      modelId={modelId}
      models={composerModels}
      onModelChange={setModelId}
      compactChip={variant === "sidebar"}
      supportsVision={modelSupportsVision(modelId)}
      onRequestVisionModel={handleRequestVisionModel}
      onCaptureChart={activeChart ? handleCaptureChart : undefined}
    />
  );

  const messageList = (
    <CopilotMessageList
      messages={messages}
      configError={configError}
      onResolveConfirm={resolveConfirm}
      confirmDisabled={isStreaming}
      focusMessageId={focusMessageId}
      isStreaming={isStreaming}
      onRegenerate={handleRegenerate}
      onPinArtifact={handlePinArtifact}
      isArtifactPinned={isPinned}
    />
  );

  if (!isEmpty) {
    return (
      <>
        <CopilotShell
          variant={variant}
          isEmpty={false}
          topChrome={showHistoryRail ? wideActiveTopChrome : activeTopChrome}
          history={historyRail}
          evidence={evidenceRail}
          banners={banners}
          composer={composer}
        >
          {messageList}
        </CopilotShell>
        <CopilotModelSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </>
    );
  }

  if (configError) {
    return (
      <>
        <div
          data-testid="copilot-panel"
          data-copilot-shell-variant={variant}
          className="copilot-shell flex h-full min-h-0 flex-col"
        >
          {minimalTopChrome ? (
            <div className="flex shrink-0 items-center justify-end gap-2 px-[var(--edge-space-4)] py-[var(--edge-space-3)]">
              {minimalTopChrome}
            </div>
          ) : null}
          {banners}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{messageList}</div>
          {composer}
        </div>
        <CopilotModelSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </>
    );
  }

  return (
    <>
      <CopilotShell
        variant={variant}
        isEmpty
        topChrome={minimalTopChrome}
        brand={<CopilotEmptyBrand variant={variant} />}
        banners={banners}
        composer={composer}
      >
        {null}
      </CopilotShell>
      <CopilotModelSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
