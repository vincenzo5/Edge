"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { editor } from "monaco-editor";
import type { ScriptCompileResult, ScriptDiagnostic } from "@edge/chart-core";
import { formatScriptError } from "@edge/chart-core";
import { compileScriptService } from "@edge/indicator-runtime";
import { EdgeButton } from "@/app/components/design-system";
import { fieldClass } from "@/app/components/design-system/styles";
import { useScriptLibraryOptional } from "@/lib/scriptLibrary/ScriptLibraryContext";
import {
  computeRevisionFromSourceAsync,
  isSupportedScriptVersion,
  normalizeScriptSource,
} from "@/lib/scriptLibrary";
import { scriptInstanceNameForScript } from "@/lib/scriptLibrary/types";

const MonacoScriptEditor = dynamic(() => import("./MonacoScriptEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-0 flex-1 items-center justify-center text-xs text-[var(--edge-text-secondary)]">
      Loading editor…
    </div>
  ),
});

type Props = {
  scriptId: string | null;
  onSaved?: (params: { scriptId: string; revision: string }) => void;
  onApplyToChart?: (params: {
    scriptId: string;
    revision: string;
    name: string;
    pane: "main" | "sub";
  }) => void;
  applyDisabled?: boolean;
  applyDisabledReason?: string;
};

const inputClass = fieldClass({ density: "compact" });
const labelClass = "text-xs text-[var(--edge-text-secondary)]";

function formatDiagnostic(d: ScriptDiagnostic): string {
  const prefix = d.severity === "warning" ? "Warning" : "Error";
  return `${prefix} — line ${d.line}, column ${d.column}: ${d.message}`;
}

export default function ScriptEditorPane({
  scriptId,
  onSaved,
  onApplyToChart,
  applyDisabled = false,
  applyDisabledReason,
}: Props) {
  const library = useScriptLibraryOptional();
  const entry = scriptId && library ? library.getScript(scriptId) : undefined;

  const [displayName, setDisplayName] = useState("");
  const [source, setSource] = useState("");
  const [dirty, setDirty] = useState(false);
  const [compileResult, setCompileResult] = useState<ScriptCompileResult | null>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [revisionPreview, setRevisionPreview] = useState<string | null>(null);
  const runDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRunRef = useRef<() => void>(() => {});
  const handleSaveRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!scriptId || !library) {
      setDisplayName("");
      setSource("");
      setDirty(false);
      setCompileResult(null);
      setStatusMessage(null);
      return;
    }
    const current = library.getScript(scriptId);
    if (!current) return;
    setDisplayName(current.displayName);
    const initialSource =
      current.draft?.source ??
      current.revisions.find((rev) => rev.revision === current.headRevision)?.source ??
      "";
    setSource(initialSource);
    setDirty(Boolean(current.draft?.dirty));
    setCompileResult(null);
    setStatusMessage(null);
  }, [scriptId, library]);

  useEffect(() => {
    if (!source.trim()) {
      setRevisionPreview(null);
      return;
    }
    let cancelled = false;
    void computeRevisionFromSourceAsync(source).then((revision) => {
      if (!cancelled) setRevisionPreview(revision);
    });
    return () => {
      cancelled = true;
    };
  }, [source]);

  const handleRun = useCallback(async () => {
    if (!scriptId || !library) return;
    setRunning(true);
    setStatusMessage(null);
    try {
      const normalized = normalizeScriptSource(source);
      const compile = compileScriptService({ source: normalized });
      setCompileResult(compile);
      library.saveDraft(scriptId, normalized, true, compile.manifest).catch(() => {
        setStatusMessage("Unable to save draft.");
      });

      if (!isSupportedScriptVersion(compile.languageVersion ?? "", compile.sdkVersion ?? "")) {
        setStatusMessage(formatScriptError("unsupported-version"));
        return;
      }

      if (!compile.ok || !compile.manifest) {
        setStatusMessage(formatScriptError("compile", "Fix compile errors before saving."));
        return;
      }

      setStatusMessage("Compile succeeded.");
    } finally {
      setRunning(false);
    }
  }, [library, scriptId, source]);

  const scheduleRun = useCallback(() => {
    if (runDebounceRef.current) clearTimeout(runDebounceRef.current);
    runDebounceRef.current = setTimeout(() => {
      runDebounceRef.current = null;
      void handleRun();
    }, 150);
  }, [handleRun]);

  useEffect(() => {
    return () => {
      if (runDebounceRef.current) clearTimeout(runDebounceRef.current);
    };
  }, []);

  const handleSave = useCallback(async () => {
    if (!scriptId || !library) return;
    setSaving(true);
    setStatusMessage(null);
    try {
      const normalized = normalizeScriptSource(source);
      await library.saveDraft(scriptId, normalized, true);
      let compile = compileResult;
      if (!compile || !compile.ok) {
        compile = compileScriptService({ source: normalized });
        setCompileResult(compile);
      }

      if (!isSupportedScriptVersion(compile.languageVersion ?? "", compile.sdkVersion ?? "")) {
        setStatusMessage(formatScriptError("unsupported-version"));
        return;
      }

      if (!compile.ok || !compile.manifest) {
        setStatusMessage(formatScriptError("compile", "Fix compile errors before saving."));
        return;
      }

      if (displayName.trim()) {
        await library.renameScript(scriptId, displayName.trim());
      }

      const revision = await library.saveRevision(scriptId, { source: normalized, compile });
      if (!revision) {
        setStatusMessage("Unable to save script revision.");
        return;
      }

      setDirty(false);
      setStatusMessage("Script saved.");
      onSaved?.({ scriptId, revision });
    } finally {
      setSaving(false);
    }
  }, [compileResult, displayName, library, onSaved, scriptId, source]);

  useEffect(() => {
    scheduleRunRef.current = scheduleRun;
    handleSaveRef.current = handleSave;
  }, [handleSave, scheduleRun]);

  const handleEditorMount = useCallback((editorInstance: editor.IStandaloneCodeEditor) => {
    editorInstance.focus();
    void import("monaco-editor").then((monaco) => {
      editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        scheduleRunRef.current();
      });
      editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        void handleSaveRef.current();
      });
    });
  }, []);

  const handleApply = useCallback(async () => {
    if (!scriptId || !library || !entry?.headRevision || !onApplyToChart) return;
    const headRecord = entry.revisions.find((rev) => rev.revision === entry.headRevision);
    if (!headRecord?.manifest) {
      setStatusMessage("Save a valid revision before applying to chart.");
      return;
    }
    onApplyToChart({
      scriptId,
      revision: entry.headRevision,
      name: scriptInstanceNameForScript(scriptId),
      pane: headRecord.manifest.pane,
    });
    setStatusMessage("Applied to chart.");
  }, [displayName, entry, library, onApplyToChart, scriptId]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key === "Enter") {
        event.preventDefault();
        scheduleRun();
      }
      if (mod && event.key === "s") {
        event.preventDefault();
        void handleSave();
      }
    },
    [handleSave, scheduleRun],
  );

  if (!scriptId || !library || !entry) {
    return (
      <div
        className="flex flex-1 items-center justify-center p-6 text-sm text-[var(--edge-text-secondary)]"
        data-testid="script-editor-empty"
      >
        Select a script or create a new one
      </div>
    );
  }

  const diagnostics = compileResult?.diagnostics ?? [];
  const canApply = Boolean(entry.headRevision && onApplyToChart && !applyDisabled);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden motion-reduce:transition-none"
      data-testid="script-editor-pane"
      onKeyDown={handleKeyDown}
    >
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-2 px-4 pt-4">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={labelClass}>Name</span>
          <input
            className={inputClass}
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setDirty(true);
            }}
            aria-label="Name"
          />
        </label>
        {revisionPreview ? (
          <p className="text-xs text-[var(--edge-text-muted)]">Draft revision {revisionPreview}</p>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden px-4 pt-3">
        <span className={`shrink-0 ${labelClass}`}>Code</span>
        <MonacoScriptEditor
          value={source}
          onChange={(next) => {
            setSource(next);
            setDirty(true);
            setCompileResult(null);
          }}
          onMount={handleEditorMount}
        />
      </div>

      {diagnostics.length > 0 ? (
        <div
          className="mx-4 mt-3 max-h-28 shrink-0 overflow-y-auto rounded border border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] p-3"
          role="alert"
          aria-label="Compile diagnostics"
        >
          <p className="mb-2 text-xs font-medium text-[var(--edge-text-primary)]">Diagnostics</p>
          <ul className="space-y-1 text-xs">
            {diagnostics.map((diag, index) => (
              <li
                key={`${diag.line}-${diag.column}-${index}`}
                className={
                  diag.severity === "warning"
                    ? "text-[var(--edge-text-secondary)]"
                    : "text-[var(--edge-negative)]"
                }
              >
                <span aria-hidden="true">{diag.severity === "warning" ? "Warning: " : "Error: "}</span>
                {formatDiagnostic(diag)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--edge-border-subtle)] px-4 py-3">
        <p className="text-xs text-[var(--edge-text-secondary)]" aria-live="polite">
          {statusMessage ?? (dirty ? "Unsaved changes" : "Saved")}
        </p>
        <div className="flex flex-wrap gap-2">
          <EdgeButton
            type="button"
            variant="secondary"
            onClick={handleRun}
            disabled={running}
            aria-label="Run script compile"
          >
            {running ? "Running…" : "Run"}
          </EdgeButton>
          <EdgeButton type="button" onClick={handleSave} disabled={saving} aria-label="Save script">
            {saving ? "Saving…" : "Save"}
          </EdgeButton>
          {onApplyToChart ? (
            <EdgeButton
              type="button"
              variant="secondary"
              onClick={() => void handleApply()}
              disabled={!canApply}
              aria-label="Apply script to chart"
              title={applyDisabledReason}
            >
              Apply to chart
            </EdgeButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
