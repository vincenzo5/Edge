'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Theme } from '@/lib/chartConfig';
import { getShortcutLabel } from '@/lib/shortcuts/formatShortcutLabel';
import ChartHeaderButton from './ChartHeaderButton';
import { FullscreenIcon } from './ChartHeaderIcons';

type Props = {
  theme: Theme;
};

export default function ChartFullscreenButton({ theme }: Props) {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    setSupported(typeof document.documentElement.requestFullscreen === 'function');
    const onChange = () => {
      setActive(document.fullscreenElement != null);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = useCallback(async () => {
    if (!supported) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Browser may block fullscreen without user gesture.
    }
  }, [supported]);

  return (
    <ChartHeaderButton
      theme={theme}
      iconOnly
      active={active}
      disabled={!supported}
      title={supported ? `Fullscreen mode | ${getShortcutLabel('fullscreen')}` : 'Fullscreen not supported'}
      onClick={toggle}
      data-testid="fullscreen-trigger"
    >
      <FullscreenIcon />
    </ChartHeaderButton>
  );
}
