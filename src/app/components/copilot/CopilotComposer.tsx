"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  ChevronDownIcon,
  PlusIcon,
} from "../chart-chrome/ChartHeaderIcons";
import { EdgeAnchoredPopover } from "../design-system";
import { menuItemClass } from "../design-system/styles";
import {
  COPILOT_HERO_DEFAULT_PLACEHOLDER,
  COPILOT_IDLE_QUESTIONS,
} from "@/lib/ai/agent/promptLibrary";
import type { CopilotMessageAttachment } from "./useCopilotThread";
import type { CopilotAttachmentSource } from "@/lib/copilot/attachmentValidation";
import { COPILOT_ATTACHMENT_MAX_PER_MESSAGE } from "@/lib/copilot/attachmentValidation";
import {
  resolveCopilotAttachmentPreviewUrl,
  uploadCopilotAttachment,
} from "@/lib/persistence/client/copilotAttachmentsClient";

export type CopilotModelOption = {
  id: string;
  label: string;
  subtitle?: string;
};

export type CopilotComposerAttachment = CopilotMessageAttachment & {
  previewUrl: string;
};

type Props = {
  disabled?: boolean;
  isStreaming: boolean;
  onSend: (text: string, attachments: CopilotMessageAttachment[]) => void;
  onCancel: () => void;
  placeholder?: string;
  mode?: "docked" | "hero";
  modelId: string;
  models: CopilotModelOption[];
  onModelChange: (modelId: string) => void;
  compactChip?: boolean;
  supportsVision: boolean;
  onRequestVisionModel?: () => void;
  onCaptureChart?: () => Promise<Blob | null>;
};

const HERO_PLACEHOLDER_ROTATE_MS = 5000;

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
}

function CopilotHeroIdlePlaceholder({ active }: { active: boolean }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const sequence = useMemo(
    () => [COPILOT_HERO_DEFAULT_PLACEHOLDER, ...COPILOT_IDLE_QUESTIONS],
    [],
  );
  const [index, setIndex] = useState(0);
  const [exitingText, setExitingText] = useState<string | null>(null);
  const [enteringText, setEnteringText] = useState<string>(COPILOT_HERO_DEFAULT_PLACEHOLDER);
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      indexRef.current = 0;
      setExitingText(null);
      setEnteringText(COPILOT_HERO_DEFAULT_PLACEHOLDER);
      return;
    }

    const timer = window.setInterval(() => {
      const currentIndex = indexRef.current;
      const nextIndex = (currentIndex + 1) % sequence.length;
      const outgoing = sequence[currentIndex];
      const incoming = sequence[nextIndex];

      if (prefersReducedMotion) {
        setExitingText(null);
        setEnteringText(incoming);
        setIndex(nextIndex);
        return;
      }

      setExitingText(outgoing);
      setEnteringText(incoming);
      setIndex(nextIndex);
    }, HERO_PLACEHOLDER_ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [active, prefersReducedMotion, sequence]);

  useEffect(() => {
    if (!exitingText || prefersReducedMotion) return;
    const timer = window.setTimeout(() => setExitingText(null), 280);
    return () => window.clearTimeout(timer);
  }, [exitingText, prefersReducedMotion]);

  const currentText = sequence[index] ?? COPILOT_HERO_DEFAULT_PLACEHOLDER;

  return (
    <div
      data-testid="copilot-hero-placeholder"
      className="copilot-hero-placeholder-track w-full"
      aria-hidden
    >
      {exitingText ? (
        <span className="copilot-hero-placeholder-line is-exiting">{exitingText}</span>
      ) : null}
      <span
        key={prefersReducedMotion ? currentText : `${index}-${enteringText}`}
        className={`copilot-hero-placeholder-line ${exitingText && !prefersReducedMotion ? "is-entering" : ""}`}
      >
        {prefersReducedMotion ? currentText : enteringText}
      </span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2 6.5L5 9.5L10 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 13V3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path
        d="M4 7L8 3L12 7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StopIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden>
      <rect x="2" y="2" width="8" height="8" rx="1" fill="currentColor" />
    </svg>
  );
}

function CloseIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function truncateChipLabel(label: string, maxChars: number): string {
  if (label.length <= maxChars) return label;
  return `${label.slice(0, maxChars - 1)}…`;
}

const queryBarClass =
  "flex min-h-[var(--copilot-bar-min-height)] w-full items-center gap-1 rounded-[var(--copilot-pill-radius)] bg-[var(--copilot-query-bar-bg)] px-2 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.24)] ring-1 ring-inset ring-[var(--copilot-query-bar-ring)]";

const circularControlClass =
  "edge-focus-ring flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed";

/** Grok-parity submit: white disc + black ↑ when enabled; muted disc when idle. */
const sendButtonEnabledClass = "bg-white text-black hover:bg-white/90";
const sendButtonDisabledClass =
  "bg-[color-mix(in_oklab,var(--edge-text-strong)_14%,transparent)] text-[var(--edge-text-muted)]";
const stopButtonClass = "bg-white text-black hover:bg-white/90";

const modelMenuPanelClass =
  "rounded-[var(--copilot-menu-radius)] border border-[color-mix(in_oklab,var(--edge-text-strong)_10%,transparent)] bg-[var(--copilot-menu-bg)] py-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)]";

const attachMenuPanelClass =
  "rounded-[var(--copilot-menu-radius)] border border-[color-mix(in_oklab,var(--edge-text-strong)_10%,transparent)] bg-[var(--copilot-menu-bg)] py-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)]";

const textareaClass =
  "min-h-[1.375em] max-h-[50vh] min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-0 text-[length:var(--copilot-composer-body-size,16px)] leading-[1.375] text-[var(--edge-text-primary)] outline-none placeholder:text-[var(--edge-text-secondary)] disabled:opacity-60";

async function uploadDraftAttachment(
  file: Blob,
  source: CopilotAttachmentSource,
  filename?: string,
): Promise<CopilotComposerAttachment> {
  const uploaded = await uploadCopilotAttachment(file, { source, filename });
  const previewUrl = await resolveCopilotAttachmentPreviewUrl(uploaded.id);
  return {
    id: uploaded.id,
    mimeType: uploaded.mimeType,
    name: uploaded.name,
    source: uploaded.source,
    previewUrl,
  };
}

export function CopilotComposer({
  disabled = false,
  isStreaming,
  onSend,
  onCancel,
  placeholder = "Ask Copilot…",
  mode = "docked",
  modelId,
  models,
  onModelChange,
  compactChip = false,
  supportsVision,
  onRequestVisionModel,
  onCaptureChart,
}: Props) {
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<CopilotComposerAttachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const chipRef = useRef<HTMLButtonElement>(null);
  const attachRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputId = useId();
  const previewUrlsRef = useRef<string[]>([]);
  const showHeroPlaceholder = mode === "hero" && !draft;

  const currentModel = models.find((model) => model.id === modelId);
  const modelLabel = currentModel?.label ?? modelId;
  const chipDisplay = compactChip ? truncateChipLabel(modelLabel, 14) : modelLabel;
  const hasDraftContent = Boolean(draft.trim()) || attachments.length > 0;
  const visionBlocked = attachments.length > 0 && !supportsVision;
  const canSubmit = hasDraftContent && !disabled && !isStreaming && !visionBlocked && !isUploading;
  const modelChipDisabled = disabled || isStreaming;
  const attachDisabled = disabled || isStreaming || isUploading;

  const syncTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  useEffect(() => {
    syncTextareaHeight();
  }, [draft, syncTextareaHeight]);

  useEffect(() => {
    if (isStreaming && menuOpen) {
      setMenuOpen(false);
    }
    if (isStreaming && attachMenuOpen) {
      setAttachMenuOpen(false);
    }
  }, [isStreaming, menuOpen, attachMenuOpen]);

  useEffect(() => {
    return () => {
      for (const url of previewUrlsRef.current) {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      }
      previewUrlsRef.current = [];
    };
  }, []);

  const closeMenus = useCallback(() => {
    setMenuOpen(false);
    setAttachMenuOpen(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeMenus]);

  const trackPreviewUrl = (previewUrl: string) => {
    if (previewUrl.startsWith("blob:")) {
      previewUrlsRef.current.push(previewUrl);
    }
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments((current) => {
      const removed = current.find((attachment) => attachment.id === attachmentId);
      if (removed?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(removed.previewUrl);
        previewUrlsRef.current = previewUrlsRef.current.filter(
          (url) => url !== removed.previewUrl,
        );
      }
      return current.filter((attachment) => attachment.id !== attachmentId);
    });
  };

  const addAttachment = async (file: Blob, source: CopilotAttachmentSource, filename?: string) => {
    if (attachments.length >= COPILOT_ATTACHMENT_MAX_PER_MESSAGE) {
      setAttachError(`Maximum ${COPILOT_ATTACHMENT_MAX_PER_MESSAGE} attachments per message.`);
      return;
    }

    if (!supportsVision) {
      onRequestVisionModel?.();
      setAttachError("Choose a vision-capable model to attach images.");
      return;
    }

    setIsUploading(true);
    setAttachError(null);
    closeMenus();
    try {
      const next = await uploadDraftAttachment(file, source, filename);
      trackPreviewUrl(next.previewUrl);
      setAttachments((current) => [...current, next]);
    } catch (error) {
      setAttachError(error instanceof Error ? error.message : "Attachment upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleModelSelect = (nextModelId: string) => {
    if (nextModelId !== modelId) {
      onModelChange(nextModelId);
    }
    closeMenus();
  };

  const submit = () => {
    const trimmed = draft.trim();
    if ((!trimmed && attachments.length === 0) || disabled || isStreaming || visionBlocked) {
      return;
    }

    onSend(
      trimmed,
      attachments.map(({ previewUrl: _previewUrl, ...attachment }) => attachment),
    );
    setDraft("");
    for (const attachment of attachments) {
      if (attachment.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    }
    previewUrlsRef.current = [];
    setAttachments([]);
    setAttachError(null);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
      }
    });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (!item.type.startsWith("image/")) continue;
      const file = item.getAsFile();
      if (!file) continue;
      event.preventDefault();
      void addAttachment(file, "paste");
      return;
    }
  };

  const handleCaptureChart = async () => {
    if (!onCaptureChart) return;
    closeMenus();
    const blob = await onCaptureChart();
    if (!blob) return;
    await addAttachment(blob, "chart_capture", "chart-capture.png");
  };

  return (
    <form
      data-testid="copilot-composer"
      data-copilot-composer-mode={mode}
      onSubmit={onSubmit}
      className={mode === "hero" ? "px-0 py-0" : "px-0 py-0"}
    >
      {attachments.length > 0 ? (
        <div
          data-testid="copilot-attachment-previews"
          className="mb-2 flex flex-wrap gap-2 px-1"
        >
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              data-testid={`copilot-attachment-preview-${attachment.id}`}
              className="copilot-attachment-preview group relative overflow-hidden rounded-lg border border-[var(--edge-border)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachment.previewUrl}
                alt={attachment.name ?? "Attachment preview"}
                className="h-16 w-16 object-cover"
              />
              <button
                type="button"
                aria-label="Remove attachment"
                data-testid={`copilot-attachment-remove-${attachment.id}`}
                className="absolute right-1 top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--copilot-canvas-bg)_72%,transparent)] text-[var(--edge-text-primary)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                onClick={() => removeAttachment(attachment.id)}
              >
                <CloseIcon size={10} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {attachError ? (
        <p
          data-testid="copilot-attach-error"
          className="mb-2 px-1 text-xs text-[var(--edge-warning)]"
          role="alert"
        >
          {attachError}
        </p>
      ) : null}

      {visionBlocked ? (
        <p
          data-testid="copilot-vision-error"
          className="mb-2 px-1 text-xs text-[var(--edge-warning)]"
          role="alert"
        >
          The selected model does not support image attachments.
        </p>
      ) : null}

      <div data-testid="copilot-query-bar" className={queryBarClass}>
        <input
          ref={fileInputRef}
          id={fileInputId}
          data-testid="copilot-attach-input"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            void addAttachment(file, "upload", file.name);
          }}
        />

        <button
          ref={attachRef}
          type="button"
          data-testid="copilot-attach"
          aria-label="Attach"
          aria-haspopup="menu"
          aria-expanded={attachMenuOpen}
          disabled={attachDisabled}
          className={`${circularControlClass} text-[var(--edge-text-primary)] hover:bg-[color-mix(in_oklab,var(--edge-text-strong)_6%,transparent)] disabled:opacity-40`}
          onClick={() => {
            if (!attachDisabled) {
              setAttachMenuOpen((open) => !open);
              setMenuOpen(false);
            }
          }}
        >
          <PlusIcon size={18} />
        </button>

        <div className="relative flex min-h-[calc(var(--copilot-bar-min-height)-8px)] min-w-0 flex-1 items-center">
          {showHeroPlaceholder ? (
            <div className="pointer-events-none absolute inset-0 flex items-center px-1">
              <CopilotHeroIdlePlaceholder active={!disabled} />
            </div>
          ) : null}
          <textarea
            ref={textareaRef}
            data-testid="copilot-composer-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder={showHeroPlaceholder ? "" : placeholder}
            rows={1}
            disabled={disabled}
            aria-label="Ask Copilot anything"
            className={textareaClass}
          />
        </div>

        <button
          ref={chipRef}
          type="button"
          data-testid="copilot-model-chip"
          aria-label="Model select"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={modelChipDisabled}
          className="edge-focus-ring flex max-w-[9rem] shrink-0 cursor-pointer items-center gap-1 rounded-[var(--copilot-pill-radius)] px-2.5 py-1.5 text-sm text-[var(--edge-text-primary)] hover:bg-[color-mix(in_oklab,var(--edge-text-strong)_6%,transparent)] disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => {
            if (!modelChipDisabled) {
              setMenuOpen((open) => !open);
              setAttachMenuOpen(false);
            }
          }}
        >
          <span className="truncate">{chipDisplay}</span>
          <ChevronDownIcon size={12} />
        </button>

        <EdgeAnchoredPopover
          open={attachMenuOpen}
          anchorRef={attachRef}
          onClose={() => setAttachMenuOpen(false)}
          align="start"
          minWidth={220}
          role="menu"
          enableMenuKeyboardNav
          panelClassName={attachMenuPanelClass}
        >
          <button
            type="button"
            role="menuitem"
            data-testid="copilot-attach-upload"
            className={menuItemClass("dark", false)}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload image
          </button>
          <button
            type="button"
            role="menuitem"
            data-testid="copilot-attach-paste-hint"
            className={menuItemClass("dark", false)}
            onClick={() => {
              closeMenus();
              setAttachError("Paste an image into the composer with ⌘V / Ctrl+V.");
            }}
          >
            Paste image
          </button>
          {onCaptureChart ? (
            <button
              type="button"
              role="menuitem"
              data-testid="copilot-attach-chart"
              className={menuItemClass("dark", false)}
              onClick={() => {
                void handleCaptureChart();
              }}
            >
              Attach chart screenshot
            </button>
          ) : null}
        </EdgeAnchoredPopover>

        <EdgeAnchoredPopover
          open={menuOpen}
          anchorRef={chipRef}
          onClose={() => setMenuOpen(false)}
          align="end"
          minWidth={278}
          role="menu"
          enableMenuKeyboardNav
          panelClassName={modelMenuPanelClass}
        >
          {models.map((model) => {
            const selected = model.id === modelId;
            return (
              <button
                key={model.id}
                type="button"
                role="menuitem"
                data-testid={`copilot-model-option-${model.id}`}
                aria-checked={selected}
                className={menuItemClass("dark", selected)}
                onClick={() => handleModelSelect(model.id)}
              >
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate">{model.label}</span>
                  {model.subtitle ? (
                    <span className="block truncate text-xs text-[var(--edge-text-muted)]">
                      {model.subtitle}
                    </span>
                  ) : null}
                </span>
                {selected ? (
                  <span className="ml-4 flex shrink-0 items-center text-[var(--edge-text-muted)]">
                    <CheckIcon />
                  </span>
                ) : null}
              </button>
            );
          })}
        </EdgeAnchoredPopover>

        {isStreaming ? (
          <button
            type="button"
            data-testid="copilot-cancel"
            aria-label="Stop"
            onClick={onCancel}
            className={`${circularControlClass} ${stopButtonClass}`}
          >
            <StopIcon />
          </button>
        ) : (
          <button
            type="submit"
            data-testid="copilot-send"
            aria-label="Submit"
            disabled={!canSubmit}
            className={`${circularControlClass} ${canSubmit ? sendButtonEnabledClass : sendButtonDisabledClass}`}
          >
            <ArrowUpIcon />
          </button>
        )}
      </div>
    </form>
  );
}
