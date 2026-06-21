'use client';

import type { Theme } from '@/lib/chart/contracts';
import type { LegendActionIcon, LegendSection } from '@/lib/chart/legend/types';
import Tooltip from './Tooltip';

type Props = {
  sections: LegendSection[];
  theme: Theme;
  onAction?: (actionId: string) => void;
  className?: string;
  style?: React.CSSProperties;
};

function ActionIcon({ icon }: { icon: LegendActionIcon }) {
  const common = 'h-3 w-3';
  switch (icon) {
    case 'visibility':
      return (
        <svg className={common} viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M1 8s2.5-4 7-4 7 4 7 4-2.5 4-7 4-7-4-7-4z"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case 'settings':
      return (
        <svg className={common} viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
          <path
            d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.4 3.4l.85.85M11.75 11.75l.85.85M3.4 12.6l.85-.85M11.75 4.25l.85-.85"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'source':
      return (
        <svg className={common} viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M4 4h8v8H4zM6 6h1M9 6h1M6 9h4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'delete':
      return (
        <svg className={common} viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M3 5h10M6 5V3.5h4V5M5 5v7.5h6V5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'more':
      return (
        <svg className={common} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <circle cx="3" cy="8" r="1.2" />
          <circle cx="8" cy="8" r="1.2" />
          <circle cx="13" cy="8" r="1.2" />
        </svg>
      );
  }
}

export default function PaneLegendBar({ sections, theme, onAction, className, style }: Props) {
  if (sections.length === 0) return null;

  const isDark = theme === 'dark';
  const muted = isDark ? 'text-[#8B8FA3]' : 'text-gray-500';
  const defaultValue = isDark ? 'text-[#E8E9ED]' : 'text-gray-900';
  const hoverBg = isDark ? 'group-hover/pane-legend:bg-[#1E2030]/90' : 'group-hover/pane-legend:bg-gray-100/90';
  const sectionHover = isDark ? 'hover:bg-white/10' : 'hover:bg-black/5';

  return (
    <div
      className={`group/pane-legend absolute left-2 top-2 z-10 max-w-[calc(100%-1rem)] ${className ?? ''}`}
      style={style}
      aria-label="Pane legend"
    >
      <div
        className={`flex max-w-full flex-wrap items-center gap-x-1 gap-y-0.5 rounded px-1 py-0.5 text-[11px] leading-tight transition-colors ${hoverBg}`}
      >
        {sections.map((section, i) => {
          if (section.kind === 'badge') {
            return (
              <Tooltip key={`badge-${i}`} content={section.tooltip} theme={theme}>
                <span
                  tabIndex={0}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-medium outline-none focus-visible:ring-1 focus-visible:ring-[#00FF88]/60 ${sectionHover} ${
                    isDark ? 'bg-[#1E2030] text-[#E8E9ED]' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {section.letter}
                </span>
              </Tooltip>
            );
          }

          if (section.kind === 'text') {
            return (
              <Tooltip key={`text-${i}`} content={section.tooltip} theme={theme}>
                <span
                  tabIndex={0}
                  className={`shrink-0 rounded px-0.5 font-medium outline-none focus-visible:ring-1 focus-visible:ring-[#00FF88]/60 ${sectionHover} ${
                    section.muted ? muted : defaultValue
                  }`}
                >
                  {section.text}
                </span>
              </Tooltip>
            );
          }

          if (section.kind === 'value') {
            const colorStyle = section.color ? { color: section.color } : undefined;
            return (
              <Tooltip key={section.id} content={section.tooltip} theme={theme}>
                <span
                  tabIndex={0}
                  style={colorStyle}
                  className={`shrink-0 rounded px-0.5 font-mono tabular-nums outline-none focus-visible:ring-1 focus-visible:ring-[#00FF88]/60 ${sectionHover} ${
                    section.color ? '' : defaultValue
                  }`}
                >
                  {section.label ? `${section.label} ` : ''}
                  {section.value}
                </span>
              </Tooltip>
            );
          }

          if (section.kind === 'action' && onAction) {
            return (
              <Tooltip key={section.id} content={section.tooltip} theme={theme}>
                <button
                  type="button"
                  disabled={section.disabled}
                  onClick={() => onAction(section.id)}
                  className={`shrink-0 rounded p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-[#00FF88]/60 disabled:opacity-40 ${sectionHover} ${
                    isDark ? 'text-[#8B8FA3] hover:text-[#E8E9ED]' : 'text-gray-500 hover:text-gray-800'
                  }`}
                  aria-label={section.tooltip}
                >
                  <ActionIcon icon={section.icon} />
                </button>
              </Tooltip>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
