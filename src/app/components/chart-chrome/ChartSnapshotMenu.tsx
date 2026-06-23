'use client';

import { useCallback, useRef, useState } from 'react';
import type { Theme } from '@/lib/chartConfig';
import { useActiveChart } from '../ActiveChartContext';
import {
  buildSnapshotFilename,
  prepareSnapshotTab,
  runSnapshotAction,
  SnapshotCaptureError,
  snapshotErrorMessage,
  type SnapshotAction,
} from '@/lib/chart/chartSnapshot';
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
import { getShortcutLabel } from '@/lib/shortcuts/formatShortcutLabel';

type Props = {
  theme: Theme;
};

export default function ChartSnapshotMenu({ theme }: Props) {
  const activeChart = useActiveChart();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCapture = activeChart?.chartCommands.canCaptureSnapshot() ?? false;
  const actionDisabled = !canCapture || pending;

  const handleAction = useCallback(
    async (action: SnapshotAction) => {
      const commands = activeChart?.chartCommands;
      if (!commands?.canCaptureSnapshot()) return;

      const config = activeChart.config;
      const filename = buildSnapshotFilename(config.symbol, config.interval);
      const targetWindow = action === 'open' ? prepareSnapshotTab() : undefined;

      setPending(true);
      setError(null);
      try {
        const blob = await commands.captureSnapshot({ includeCrosshair: false });
        const result = await runSnapshotAction(action, blob, filename, targetWindow);
        if (!result.ok) {
          setError(snapshotErrorMessage(result.reason));
          return;
        }
        setOpen(false);
      } catch (caught) {
        if (caught instanceof SnapshotCaptureError) {
          setError(snapshotErrorMessage(caught.reason));
        } else {
          setError(snapshotErrorMessage('capture_failed'));
        }
      } finally {
        setPending(false);
      }
    },
    [activeChart],
  );

  return (
    <>
      <ChartHeaderButton
        ref={anchorRef}
        theme={theme}
        iconOnly
        active={open}
        title="Take a snapshot"
        onClick={() => {
          setError(null);
          setOpen((o) => !o);
        }}
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
          trailing={<span className="opacity-50">{getShortcutLabel('snapshotDownload')}</span>}
          disabled={actionDisabled}
          disabledReason={
            pending ? 'Capturing…' : canCapture ? undefined : 'Chart is still loading'
          }
          onClick={() => void handleAction('download')}
        />
        <ChartMenuItemRow
          theme={theme}
          label="Copy image"
          icon={<CopyIcon size={14} />}
          trailing={<span className="opacity-50">{getShortcutLabel('snapshotCopy')}</span>}
          disabled={actionDisabled}
          disabledReason={
            pending ? 'Capturing…' : canCapture ? undefined : 'Chart is still loading'
          }
          onClick={() => void handleAction('copy')}
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
          disabled={actionDisabled}
          disabledReason={
            pending ? 'Capturing…' : canCapture ? undefined : 'Chart is still loading'
          }
          onClick={() => void handleAction('open')}
        />
        <ChartMenuItemRow
          theme={theme}
          label="Tweet image"
          disabled
          disabledReason="Coming soon"
        />
        {error ? (
          <div
            role="alert"
            className="border-t border-[var(--tv-border-strong)] px-3 py-2 text-xs text-red-400"
          >
            {error}
          </div>
        ) : null}
      </ChartAnchoredPopover>
    </>
  );
}
