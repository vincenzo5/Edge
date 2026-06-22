import { describe, it, expect } from 'vitest';
import { DrawingStore } from './drawingStore';
import type { SerializedDrawing } from './contracts';

const sample: SerializedDrawing = {
  id: 'd1',
  name: 'trend_line',
  label: 'Trend',
  points: [{ timestamp: 1000, value: 100 }, { timestamp: 2000, value: 110 }],
  visible: true,
  locked: false,
  zLevel: 0,
  paneId: 'price',
};

describe('DrawingStore', () => {
  it('execute add then undo removes drawing', () => {
    const store = new DrawingStore();
    store.execute({ type: 'add', drawing: sample });
    expect(store.getDrawings()).toHaveLength(1);
    store.undo();
    expect(store.getDrawings()).toHaveLength(0);
  });

  it('redo restores after undo', () => {
    const store = new DrawingStore();
    store.execute({ type: 'add', drawing: sample });
    store.undo();
    store.redo();
    expect(store.getDrawings()).toHaveLength(1);
    expect(store.getDrawings()[0].id).toBe('d1');
  });

  it('updatePoints undo restores coordinates', () => {
    const store = new DrawingStore();
    store.hydrate([sample]);
    const before = sample.points.map((p) => ({ ...p }));
    const after = [
      { timestamp: 1000, value: 50 },
      { timestamp: 2000, value: 60 },
    ];
    store.execute({ type: 'updatePoints', id: 'd1', before, after });
    expect(store.getDrawings()[0].points[0].value).toBe(50);
    store.undo();
    expect(store.getDrawings()[0].points[0].value).toBe(100);
  });

  it('hydrate clears history', () => {
    const store = new DrawingStore();
    store.execute({ type: 'add', drawing: sample });
    store.hydrate([]);
    expect(store.canUndo()).toBe(false);
    expect(store.getDrawings()).toHaveLength(0);
  });

  it('updateMeta undo restores visible and locked', () => {
    const store = new DrawingStore();
    store.hydrate([sample]);
    store.execute({
      type: 'updateMeta',
      id: 'd1',
      before: { visible: true, locked: false },
      after: { visible: false, locked: true },
    });
    expect(store.getDrawings()[0].visible).toBe(false);
    expect(store.getDrawings()[0].locked).toBe(true);
    store.undo();
    expect(store.getDrawings()[0].visible).toBe(true);
    expect(store.getDrawings()[0].locked).toBe(false);
  });

  it('updateMeta redo restores meta change after undo', () => {
    const store = new DrawingStore();
    store.hydrate([sample]);
    store.execute({
      type: 'updateMeta',
      id: 'd1',
      before: { label: 'Trend' },
      after: { label: 'Renamed' },
    });
    store.undo();
    expect(store.getDrawings()[0].label).toBe('Trend');
    store.redo();
    expect(store.getDrawings()[0].label).toBe('Renamed');
    expect(store.canRedo()).toBe(false);
  });

  it('reorderZ undo restores previous z-order', () => {
    const store = new DrawingStore();
    const d2: SerializedDrawing = { ...sample, id: 'd2', label: 'Second', zLevel: 1 };
    store.hydrate([sample, d2]);
    const previousOrder = ['d1', 'd2'];
    const order = ['d2', 'd1'];
    store.execute({ type: 'reorderZ', order, previousOrder });
    const drawings = store.getDrawings();
    expect(drawings.find((d) => d.id === 'd1')!.zLevel).toBe(1);
    expect(drawings.find((d) => d.id === 'd2')!.zLevel).toBe(0);
    store.undo();
    expect(store.getDrawings().find((d) => d.id === 'd1')!.zLevel).toBe(0);
    expect(store.getDrawings().find((d) => d.id === 'd2')!.zLevel).toBe(1);
  });

  it('reorderZ redo restores swapped order', () => {
    const store = new DrawingStore();
    const d2: SerializedDrawing = { ...sample, id: 'd2', label: 'Second', zLevel: 1 };
    store.hydrate([sample, d2]);
    store.execute({ type: 'reorderZ', order: ['d2', 'd1'], previousOrder: ['d1', 'd2'] });
    store.undo();
    expect(store.getDrawings().find((d) => d.id === 'd1')!.zLevel).toBe(0);
    store.redo();
    expect(store.getDrawings().find((d) => d.id === 'd1')!.zLevel).toBe(1);
    expect(store.canUndo()).toBe(true);
    expect(store.canRedo()).toBe(false);
  });
});
