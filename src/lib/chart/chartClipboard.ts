import type { IndicatorConfig } from './contracts';
import type { DrawingClipboardItem } from './drawingClone';
import { toClipboardItem } from './drawingClone';
import type { SerializedDrawing } from './contracts';
import type { StudyTemplatePayload } from './presets/types';

export type ClipboardPayload =
  | { kind: 'drawings'; items: DrawingClipboardItem[] }
  | { kind: 'study'; item: StudyTemplatePayload };

let clipboard: ClipboardPayload | null = null;

export function copyDrawings(drawings: SerializedDrawing[]): void {
  if (drawings.length === 0) {
    clipboard = null;
    return;
  }
  clipboard = {
    kind: 'drawings',
    items: drawings.map(toClipboardItem),
  };
}

export function copyStudy(indicator: IndicatorConfig): void {
  clipboard = {
    kind: 'study',
    item: {
      name: indicator.name,
      pane: indicator.pane,
      inputs: indicator.inputs ? { ...indicator.inputs } : undefined,
      styles: indicator.styles ? { ...indicator.styles } : undefined,
      visible: indicator.visible,
    },
  };
}

export function readClipboard(): ClipboardPayload | null {
  return clipboard;
}

export function hasDrawingClipboard(): boolean {
  return clipboard?.kind === 'drawings' && clipboard.items.length > 0;
}

export function clearClipboard(): void {
  clipboard = null;
}
