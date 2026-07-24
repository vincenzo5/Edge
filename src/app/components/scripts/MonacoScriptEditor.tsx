"use client";

import { useMemo } from "react";
import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
};

function resolveMonacoTheme(): "vs" | "vs-dark" {
  if (typeof document === "undefined") return "vs-dark";
  return document.documentElement.classList.contains("dark") ? "vs-dark" : "vs";
}

export default function MonacoScriptEditor({ value, onChange, onMount }: Props) {
  const theme = useMemo(() => resolveMonacoTheme(), []);

  return (
    <div
      className="edge-focus-ring min-h-0 w-full flex-1 overflow-hidden rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)]"
      data-testid="script-source-editor"
      aria-label="Script source"
    >
      <Editor
        height="100%"
        language="typescript"
        theme={theme}
        value={value}
        onChange={(next) => onChange(next ?? "")}
        onMount={onMount}
        options={{
          minimap: { enabled: false },
          fontSize: 12,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          tabSize: 2,
          automaticLayout: true,
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          parameterHints: { enabled: false },
          padding: { top: 8, bottom: 8 },
        }}
      />
    </div>
  );
}
