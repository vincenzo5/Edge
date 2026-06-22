'use client';

import type { Theme } from '@/lib/chartConfig';
import { headerDividerClass } from './headerStyles';

type Props = {
  theme: Theme;
};

export default function ChartHeaderDivider({ theme }: Props) {
  return <span className={headerDividerClass(theme)} aria-hidden />;
}
