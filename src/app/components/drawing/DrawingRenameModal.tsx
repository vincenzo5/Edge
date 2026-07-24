'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Theme } from '@/lib/chart/contracts';
import EdgeButton from '../design-system/EdgeButton';
import EdgeModalShell from '../design-system/EdgeModalShell';
import { fieldClass, labeledFieldClass } from '../design-system/styles';

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
  void theme;
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

  return (
    <EdgeModalShell
      open={open}
      title="Rename drawing"
      onClose={onClose}
      maxWidth="sm"
      align="center"
      footer={
        <div className="flex justify-end gap-2">
          <EdgeButton variant="chrome" onClick={onClose}>
            Cancel
          </EdgeButton>
          <EdgeButton variant="primary" disabled={!value.trim()} onClick={submit}>
            Rename
          </EdgeButton>
        </div>
      }
    >
      <label className={`${labeledFieldClass()} flex-col items-stretch gap-1`}>
        <span>Label</span>
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
          className={fieldClass({ density: 'standard' })}
        />
      </label>
    </EdgeModalShell>
  );
}
