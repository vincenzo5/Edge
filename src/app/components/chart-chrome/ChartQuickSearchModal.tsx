'use client';

import { useEffect, useRef } from 'react';
import type { Theme } from '@/lib/chartConfig';

type Props = {
  open: boolean;
  theme: Theme;
  onClose: () => void;
};

export default function ChartQuickSearchModal({ open, theme, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 pt-[15vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="quick-search-modal"
    >
      <div
        className={`w-full max-w-lg overflow-hidden rounded-lg shadow-2xl ${
          isDark ? 'border border-[#363a45] bg-[#1e222d] text-[#d1d4dc]' : 'border border-gray-200 bg-white text-gray-900'
        }`}
        role="dialog"
        aria-label="Search tool or function"
      >
        <div
          className={`flex items-center justify-between border-b px-4 py-3 ${
            isDark ? 'border-[#363a45]' : 'border-gray-200'
          }`}
        >
          <span className="text-sm font-medium">Search tool or function</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-lg leading-none opacity-60 hover:opacity-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div
          className={`flex items-center gap-2 border-b px-4 py-2 ${
            isDark ? 'border-[#363a45]' : 'border-gray-200'
          }`}
        >
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden className="opacity-50">
            <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.2" />
            <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder=""
            className="flex-1 bg-transparent text-sm outline-none"
            data-testid="quick-search-input"
          />
        </div>
        <div className="flex min-h-[200px] items-center justify-center px-4 py-8 text-center text-sm opacity-50">
          Type to search for drawings, functions and settings
        </div>
      </div>
    </div>
  );
}
