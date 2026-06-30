import type { ReactNode } from 'react';
import type { Theme } from '@edge/chart-core';
import type { LegendActionIcon, LegendSection } from '@edge/chart-core/legend/types';
import { PRICE_AXIS_WIDTH } from '@edge/chart-core/layout';

/** Reserve space for always-visible collapsed pane controls on the right. */
const COLLAPSED_CONTROLS_WIDTH = 112;

/** Minimal tooltip substitute — native title attribute only. */
function Hint({ content, children }: { content?: string; children: React.ReactNode }) {
  return <span title={content}>{children}</span>;
}

type Props = {
  sections: LegendSection[];
  theme: Theme;
  onAction?: (actionId: string) => void;
  className?: string;
  style?: React.CSSProperties;
  /** Single-line legend centered in the collapsed pane strip. */
  compact?: boolean;
  /** Optional content rendered before the first legend section (e.g. symbol nav arrows). */
  leading?: ReactNode;
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

export default function PaneLegendBar({
  sections,
  theme,
  onAction,
  className,
  style,
  compact = false,
  leading,
}: Props) {
  if (sections.length === 0 && !leading) return null;

  void theme;
  const muted = 'text-[var(--edge-text-secondary)]';
  const defaultValue = 'text-[var(--edge-text-strong)]';
  const hoverBg = compact
    ? ''
    : 'group-hover/pane-legend:bg-[var(--edge-surface-panel)]/90 group-hover/pane-legend:backdrop-blur-[2px]';
  const sectionHover = 'hover:bg-[var(--edge-surface-hover)]';

  return (
    <div
      className={`group/pane-legend absolute left-2 z-10 ${
        compact ? 'top-0 flex h-full items-center' : 'top-2 max-w-[calc(100%-1rem)]'
      } ${className ?? ''}`}
      style={{
        ...(compact ? { right: PRICE_AXIS_WIDTH + COLLAPSED_CONTROLS_WIDTH } : {}),
        ...style,
      }}
      aria-label="Pane legend"
    >
      <div
        className={`flex max-w-full items-center gap-x-1.5 rounded-[var(--edge-radius-sm)] px-1.5 text-[12px] leading-tight transition-colors ${
          compact ? 'min-w-0 flex-nowrap overflow-hidden' : 'flex-wrap gap-y-0.5 py-0.5'
        } ${hoverBg}`}
      >
        {leading ? <div className="flex shrink-0 items-center">{leading}</div> : null}
        {sections.map((section, i) => {
          if (compact && section.kind === 'action') return null;
          if (section.kind === 'badge') {
            return (
              <Hint key={`badge-${i}`} content={section.tooltip}>
                <span
                  tabIndex={0}
                  className={`edge-focus-ring flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--edge-surface-active)] text-[10px] font-medium text-[var(--edge-text-strong)] ${sectionHover}`}
                >
                  {section.letter}
                </span>
              </Hint>
            );
          }

          if (section.kind === 'text') {
            return (
              <Hint key={`text-${i}`} content={section.tooltip}>
                <span
                  tabIndex={0}
                  className={`edge-focus-ring shrink-0 rounded px-0.5 font-semibold ${sectionHover} ${
                    section.muted ? muted : defaultValue
                  }`}
                >
                  {section.text}
                </span>
              </Hint>
            );
          }

          if (section.kind === 'value') {
            const colorStyle = section.color ? { color: section.color } : undefined;
            return (
              <Hint key={section.id} content={section.tooltip}>
                <span
                  tabIndex={0}
                  style={colorStyle}
                  className={`edge-focus-ring shrink-0 rounded px-0.5 font-mono tabular-nums ${sectionHover} ${
                    section.color ? '' : defaultValue
                  }`}
                >
                  {section.label ? `${section.label} ` : ''}
                  {section.value}
                </span>
              </Hint>
            );
          }

          if (section.kind === 'action' && onAction) {
            return (
              <Hint key={section.id} content={section.tooltip}>
                <button
                  type="button"
                  disabled={section.disabled}
                  onClick={() => onAction(section.id)}
                  className={`edge-focus-ring shrink-0 rounded p-0.5 text-[var(--edge-text-secondary)] hover:text-[var(--edge-text-strong)] disabled:opacity-40 ${sectionHover}`}
                  aria-label={section.tooltip}
                >
                  <ActionIcon icon={section.icon} />
                </button>
              </Hint>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
