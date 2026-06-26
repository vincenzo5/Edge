'use client';

import { useEffect, useRef } from 'react';
import type { Theme } from '@/lib/chartConfig';
import { EdgeModalShell, EdgeSearchInput } from '../design-system';

type Props = {
  open: boolean;
  theme: Theme;
  onClose: () => void;
};

export default function ChartQuickSearchModal({ open, theme, onClose }: Props) {
  void theme;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  return (
    <EdgeModalShell
      open={open}
      title="Search tool or function"
      onClose={onClose}
      maxWidth="sm"
      align="center"
      testId="quick-search-modal"
    >
      <div className="border-b border-[var(--edge-border)] px-4 py-2">
        <EdgeSearchInput
          ref={inputRef}
          leadingIcon={
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden className="opacity-50">
              <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.2" />
              <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          }
          data-testid="quick-search-input"
        />
      </div>
      <div className="flex min-h-[200px] items-center justify-center px-4 py-8 text-center text-sm text-[var(--edge-text-secondary)]">
        Type to search for drawings, functions and settings
      </div>
    </EdgeModalShell>
  );
}
