'use client';

import { useRef, useState } from 'react';
import type { Theme } from '@/lib/chartConfig';
import { getCatalogEntry } from '@/lib/chart/indicators/registry';
import ChartAnchoredPopover from './ChartAnchoredPopover';
import ChartHeaderButton from './ChartHeaderButton';
import ChartMenuItemRow from './ChartMenuItemRow';
import ChartMenuSectionHeader from './ChartMenuSectionHeader';
import { ChevronDownIcon } from './ChartHeaderIcons';

type Props = {
  theme: Theme;
  favorites: string[];
  onSelect: (name: string) => void;
};

export default function ChartIndicatorFavoritesMenu({ theme, favorites, onSelect }: Props) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <ChartHeaderButton
        ref={anchorRef}
        theme={theme}
        iconOnly
        active={open}
        title="Favorite indicators"
        onClick={() => setOpen((o) => !o)}
        data-testid="indicator-favorites-trigger"
      >
        <ChevronDownIcon />
      </ChartHeaderButton>
      <ChartAnchoredPopover
        open={open}
        anchorRef={anchorRef}
        theme={theme}
        onClose={() => setOpen(false)}
        minWidth={260}
      >
        <ChartMenuSectionHeader theme={theme} label="Favorite indicators" />
        {favorites.length === 0 ? (
          <div className="px-3 py-2 text-xs opacity-60">No favorites yet</div>
        ) : (
          favorites.map((name) => {
            const entry = getCatalogEntry(name);
            return (
              <ChartMenuItemRow
                key={name}
                theme={theme}
                label={name}
                disabled={!entry?.implemented}
                disabledReason={entry?.implemented ? undefined : 'Coming soon'}
                onClick={() => {
                  onSelect(name);
                  setOpen(false);
                }}
              />
            );
          })
        )}
      </ChartAnchoredPopover>
    </>
  );
}
