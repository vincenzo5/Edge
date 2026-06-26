'use client';

import { useRef, useState } from 'react';
import type { Theme } from '@/lib/chartConfig';
import ChartAnchoredPopover from './ChartAnchoredPopover';
import ChartHeaderButton from './ChartHeaderButton';
import ChartMenuItemRow from './ChartMenuItemRow';
import { TemplateGridIcon } from './ChartHeaderIcons';

type Props = {
  theme: Theme;
  onSaveStudyTemplate: () => void;
  onOpenTemplate: () => void;
};

export default function ChartTemplateMenu({
  theme,
  onSaveStudyTemplate,
  onOpenTemplate,
}: Props) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <ChartHeaderButton
        ref={anchorRef}
        theme={theme}
        iconOnly
        active={open}
        title="Indicator templates"
        onClick={() => setOpen((o) => !o)}
        data-testid="template-menu-trigger"
      >
        <TemplateGridIcon />
      </ChartHeaderButton>
      <ChartAnchoredPopover
        open={open}
        anchorRef={anchorRef}
        theme={theme}
        onClose={() => setOpen(false)}
        minWidth={220}
      >
        <ChartMenuItemRow
          theme={theme}
          label="Save indicator template..."
          onClick={() => {
            onSaveStudyTemplate();
            setOpen(false);
          }}
        />
        <div className="my-1 border-t border-[var(--edge-border-strong)]" />
        <ChartMenuItemRow
          theme={theme}
          label="Open template..."
          onClick={() => {
            onOpenTemplate();
            setOpen(false);
          }}
        />
      </ChartAnchoredPopover>
    </>
  );
}
