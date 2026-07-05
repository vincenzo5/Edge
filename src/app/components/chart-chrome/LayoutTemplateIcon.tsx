import type { LayoutTemplate } from '@/lib/chart/layoutTemplates';

type Props = {
  template: LayoutTemplate;
  size?: number;
};

/** Data-driven layout preview icon from template geometry. */
export default function LayoutTemplateIcon({ template, size = 20 }: Props) {
  const gap = 1;
  const pad = 1;
  const inner = size - pad * 2;
  const colWidth = (inner - gap * (template.columns - 1)) / template.columns;
  const rowHeight = (inner - gap * (template.rows - 1)) / template.rows;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden>
      {template.cells.map((cell, i) => {
        const cs = cell.colSpan ?? 1;
        const rs = cell.rowSpan ?? 1;
        const x = pad + cell.col * (colWidth + gap);
        const y = pad + cell.row * (rowHeight + gap);
        const w = colWidth * cs + gap * (cs - 1);
        const h = rowHeight * rs + gap * (rs - 1);
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={w}
            height={h}
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
          />
        );
      })}
    </svg>
  );
}
