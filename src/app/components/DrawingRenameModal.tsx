'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Theme } from '@/lib/chart/contracts';

type Props = {
  open: boolean;
  theme: Theme;
  initialLabel: string;
  onClose: () => void;
  onSave: (label: string) => void;
};

export default function DrawingRenameModal({
  open,
  theme,
  initialLabel,
  onClose,
  onSave,
}: Props) {
  const isDark = theme === 'dark';
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialLabel);

  useEffect(() => {
    if (!open) return;
    setValue(initialLabel);
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, initialLabel]);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSave(trimmed);
    onClose();
  }, [onClose, onSave, value]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full max-w-sm rounded-lg border p-4 shadow-xl ${
          isDark
            ? 'border-gray-700 bg-gray-900 text-gray-100'
            : 'border-gray-200 bg-white text-gray-900'
        }`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="mb-3 text-base font-semibold">
          Rename drawing
        </h2>
        <label className="mb-4 flex flex-col gap-1 text-sm">
          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Label</span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submit();
              }
            }}
            className={`rounded border px-3 py-2 text-sm ${
              isDark
                ? 'border-gray-600 bg-gray-950 text-gray-100'
                : 'border-gray-300 bg-white text-gray-900'
            }`}
          />
        </label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`rounded px-3 py-1.5 text-sm ${
              isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}
