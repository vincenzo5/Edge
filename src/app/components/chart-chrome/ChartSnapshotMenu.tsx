'use client';

import { useRef, useState } from 'react';
import type { Theme } from '@/lib/chartConfig';
import ChartAnchoredPopover from './ChartAnchoredPopover';
import ChartHeaderButton from './ChartHeaderButton';
import ChartMenuItemRow from './ChartMenuItemRow';
import {
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  LinkIcon,
  SnapshotIcon,
} from './ChartHeaderIcons';

type Props = {
  theme: Theme;
};

export default function ChartSnapshotMenu({ theme }: Props) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <ChartHeaderButton
        ref={anchorRef}
        theme={theme}
        iconOnly
        active={open}
        title="Take a snapshot"
        onClick={() => setOpen((o) => !o)}
        data-testid="snapshot-trigger"
      >
        <SnapshotIcon />
      </ChartHeaderButton>
      <ChartAnchoredPopover
        open={open}
        anchorRef={anchorRef}
        theme={theme}
        onClose={() => setOpen(false)}
        align="end"
        minWidth={220}
      >
        <ChartMenuItemRow
          theme={theme}
          label="Download image"
          icon={<DownloadIcon size={14} />}
          trailing={<span className="opacity-50">⌥ ⌘ S</span>}
          disabled
          disabledReason="Coming soon"
        />
        <ChartMenuItemRow
          theme={theme}
          label="Copy image"
          icon={<CopyIcon size={14} />}
          trailing={<span className="opacity-50">⇧ ⌘ S</span>}
          disabled
          disabledReason="Coming soon"
        />
        <ChartMenuItemRow
          theme={theme}
          label="Copy link"
          icon={<LinkIcon size={14} />}
          trailing={<span className="opacity-50">⌥ S</span>}
          disabled
          disabledReason="Coming soon"
        />
        <ChartMenuItemRow
          theme={theme}
          label="Open in new tab"
          icon={<ExternalLinkIcon size={14} />}
          disabled
          disabledReason="Coming soon"
        />
        <ChartMenuItemRow
          theme={theme}
          label="Tweet image"
          disabled
          disabledReason="Coming soon"
        />
      </ChartAnchoredPopover>
    </>
  );
}
