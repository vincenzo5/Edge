import type { SerializedDrawing } from './contracts';

export type PasteAnchor =
  | { mode: 'offset'; deltaTimestamp: number; deltaValueRatio: number }
  | { mode: 'crosshair'; timestamp: number; value: number };

export type DrawingClipboardItem = Omit<SerializedDrawing, 'id' | 'zLevel'>;

export function toClipboardItem(d: SerializedDrawing): DrawingClipboardItem {
  const { id: _id, zLevel: _z, ...rest } = d;
  return {
    ...rest,
    points: d.points.map((p) => ({ ...p })),
    styles: d.styles ? { ...d.styles } : undefined,
  };
}

function firstAnchorPoint(d: SerializedDrawing | DrawingClipboardItem): {
  timestamp?: number;
  value?: number;
} | null {
  const p = d.points[0];
  if (!p) return null;
  return { timestamp: p.timestamp, value: p.value };
}

function remapPoint(
  p: SerializedDrawing['points'][number],
  anchor: PasteAnchor,
  sourceAnchor: { timestamp?: number; value?: number },
): SerializedDrawing['points'][number] {
  const next = { ...p, dataIndex: undefined };

  if (anchor.mode === 'offset') {
    if (next.timestamp != null) {
      next.timestamp = next.timestamp + anchor.deltaTimestamp;
    }
    if (next.value != null) {
      next.value = next.value * (1 + anchor.deltaValueRatio);
    }
    return next;
  }

  const srcTs = sourceAnchor.timestamp;
  const srcVal = sourceAnchor.value;
  if (next.timestamp != null && srcTs != null) {
    next.timestamp = next.timestamp - srcTs + anchor.timestamp;
  }
  if (next.value != null && srcVal != null && Number.isFinite(srcVal)) {
    next.value = next.value - srcVal + anchor.value;
  }
  return next;
}

export function cloneDrawingPayload(
  d: SerializedDrawing | DrawingClipboardItem,
  opts: {
    newId: string;
    anchor: PasteAnchor;
    zLevel: number;
    labelSuffix?: string;
  },
): SerializedDrawing {
  const sourceAnchor = firstAnchorPoint(d) ?? { timestamp: 0, value: 0 };
  const label =
    opts.labelSuffix != null && opts.labelSuffix.length > 0
      ? `${d.label}${opts.labelSuffix}`
      : d.label;

  return {
    name: d.name,
    label,
    points: d.points.map((p) => remapPoint(p, opts.anchor, sourceAnchor)),
    mode: d.mode,
    styles: d.styles ? { ...d.styles } : undefined,
    visible: d.visible,
    locked: d.locked,
    zLevel: opts.zLevel,
    paneId: d.paneId ?? 'price',
    id: opts.newId,
  };
}

/** Default duplicate offset: +1 day on time, +0.5% on price. */
export const DUPLICATE_ANCHOR: PasteAnchor = {
  mode: 'offset',
  deltaTimestamp: 86400000,
  deltaValueRatio: 0.005,
};

export function cloneDrawingsForPaste(
  items: DrawingClipboardItem[],
  anchor: PasteAnchor,
  startZLevel: number,
  newId: () => string,
): SerializedDrawing[] {
  return items.map((item, i) =>
    cloneDrawingPayload(item, {
      newId: newId(),
      anchor,
      zLevel: startZLevel + i,
    }),
  );
}
