'use client';

import { forwardRef, type ReactNode } from 'react';
import type { Theme } from '@/lib/chartConfig';
import Tooltip from '../Tooltip';
import { headerButtonClass, headerIconButtonClass } from './headerStyles';

type Props = {
  theme: Theme;
  label?: string;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  iconOnly?: boolean;
  onClick?: () => void;
  children?: ReactNode;
  'data-testid'?: string;
  'aria-haspopup'?: boolean | 'menu' | 'dialog' | 'listbox' | 'tree' | 'grid';
  'aria-expanded'?: boolean;
};

const ChartHeaderButton = forwardRef<HTMLButtonElement, Props>(function ChartHeaderButton(
  {
    theme,
    label,
    title,
    active,
    disabled,
    iconOnly,
    onClick,
    children,
    'data-testid': testId,
    'aria-haspopup': ariaHasPopup,
    'aria-expanded': ariaExpanded,
  },
  ref,
) {
  const cls = iconOnly
    ? headerIconButtonClass(theme, active, disabled)
    : headerButtonClass(theme, active, disabled);

  const button = (
    <button
      ref={ref}
      type="button"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className={cls}
      aria-label={title ?? label}
      aria-haspopup={ariaHasPopup}
      aria-expanded={ariaExpanded}
    >
      {children}
      {label && !iconOnly ? <span>{label}</span> : null}
    </button>
  );

  if (title) {
    return (
      <Tooltip content={title} theme={theme}>
        {button}
      </Tooltip>
    );
  }

  return button;
});

export default ChartHeaderButton;
