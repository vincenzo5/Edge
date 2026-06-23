import type { DrawingMetadata, DrawingStyles, SerializedDrawing } from './contracts';

export type DrawingMetaPatch = Partial<
  Pick<SerializedDrawing, 'styles' | 'label' | 'visible' | 'locked' | 'metadata'>
>;

export type DrawingCommand =
  | { type: 'add'; drawing: SerializedDrawing }
  | { type: 'remove'; id: string; drawing: SerializedDrawing }
  | { type: 'updatePoints'; id: string; before: SerializedDrawing['points']; after: SerializedDrawing['points'] }
  | {
      type: 'updateMeta';
      id: string;
      before: DrawingMetaPatch;
      after: DrawingMetaPatch;
    }
  | { type: 'reorderZ'; order: string[]; previousOrder: string[] }
  | { type: 'batch'; commands: DrawingCommand[] };

const MAX_HISTORY = 50;

function cloneMetadata(metadata?: DrawingMetadata): DrawingMetadata | undefined {
  if (!metadata) return undefined;
  return {
    ...metadata,
    fields: metadata.fields ? { ...metadata.fields } : undefined,
    computed: metadata.computed ? { ...metadata.computed } : undefined,
    links: metadata.links ? metadata.links.map((l) => ({ ...l })) : undefined,
  };
}

function cloneDrawing(d: SerializedDrawing): SerializedDrawing {
  return {
    ...d,
    points: d.points.map((p) => ({ ...p })),
    styles: d.styles ? { ...d.styles } : undefined,
    metadata: cloneMetadata(d.metadata),
  };
}

function applyCommand(drawings: SerializedDrawing[], cmd: DrawingCommand): SerializedDrawing[] {
  switch (cmd.type) {
    case 'add':
      return [...drawings, cloneDrawing(cmd.drawing)];
    case 'remove':
      return drawings.filter((d) => d.id !== cmd.id);
    case 'updatePoints':
      return drawings.map((d) =>
        d.id === cmd.id ? { ...d, points: cmd.after.map((p) => ({ ...p })) } : d
      );
    case 'updateMeta':
      return drawings.map((d) => (d.id === cmd.id ? { ...d, ...cmd.after } : d));
    case 'reorderZ':
      const byId = new Map(drawings.map((d) => [d.id!, d]));
      return cmd.order
        .map((id, i) => {
          const d = byId.get(id);
          return d ? { ...d, zLevel: i } : null;
        })
        .filter((d): d is SerializedDrawing => d != null);
    case 'batch':
      let next = drawings;
      for (const c of cmd.commands) {
        next = applyCommand(next, c);
      }
      return next;
    default:
      return drawings;
  }
}

function reverseCommand(cmd: DrawingCommand): DrawingCommand {
  switch (cmd.type) {
    case 'add':
      return { type: 'remove', id: cmd.drawing.id!, drawing: cmd.drawing };
    case 'remove':
      return { type: 'add', drawing: cmd.drawing };
    case 'updatePoints':
      return { type: 'updatePoints', id: cmd.id, before: cmd.after, after: cmd.before };
    case 'updateMeta':
      return { type: 'updateMeta', id: cmd.id, before: cmd.after, after: cmd.before };
    case 'reorderZ':
      return { type: 'reorderZ', order: cmd.previousOrder, previousOrder: cmd.order };
    case 'batch':
      return { type: 'batch', commands: cmd.commands.map(reverseCommand).reverse() };
    default:
      return cmd;
  }
}

export class DrawingStore {
  private drawings: SerializedDrawing[] = [];
  private undoStack: DrawingCommand[] = [];
  private redoStack: DrawingCommand[] = [];
  private listeners = new Set<() => void>();

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  getDrawings(): SerializedDrawing[] {
    return this.drawings;
  }

  replaceDrawing(id: string, drawing: SerializedDrawing, notify = true) {
    this.drawings = this.drawings.map((d) =>
      d.id === id ? cloneDrawing(drawing) : d
    );
    if (notify) this.notify();
  }

  setDrawings(drawings: SerializedDrawing[], clearHistory = true) {
    this.drawings = drawings.map(cloneDrawing);
    if (clearHistory) {
      this.undoStack = [];
      this.redoStack = [];
    }
    this.notify();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  hydrate(drawings: SerializedDrawing[]) {
    this.drawings = drawings.map(cloneDrawing);
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  execute(cmd: DrawingCommand, recordHistory = true) {
    this.drawings = applyCommand(this.drawings, cmd);
    if (recordHistory) {
      this.undoStack.push(cmd);
      if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
      this.redoStack = [];
    }
    this.notify();
  }

  undo(): boolean {
    const cmd = this.undoStack.pop();
    if (!cmd) return false;
    const rev = reverseCommand(cmd);
    this.drawings = applyCommand(this.drawings, rev);
    this.redoStack.push(cmd);
    this.notify();
    return true;
  }

  redo(): boolean {
    const cmd = this.redoStack.pop();
    if (!cmd) return false;
    this.drawings = applyCommand(this.drawings, cmd);
    this.undoStack.push(cmd);
    this.notify();
    return true;
  }
}

export function pointsEqual(
  a: SerializedDrawing['points'],
  b: SerializedDrawing['points']
): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (p, i) =>
      p.timestamp === b[i].timestamp &&
      p.value === b[i].value &&
      p.dataIndex === b[i].dataIndex
  );
}
