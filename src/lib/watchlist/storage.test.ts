import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_WATCHLIST_STATE,
  addWatchlistItem,
  addWatchlistItems,
  clearWatchlist,
  clearWatchlistStorage,
  createWatchlist,
  deleteWatchlist,
  duplicateWatchlist,
  getActiveWatchlist,
  loadWatchlistState,
  MAX_WATCHLISTS,
  removeWatchlistItem,
  renameWatchlist,
  saveWatchlistState,
  selectWatchlistSymbol,
  switchWatchlist,
  MAX_WATCHLIST_ITEMS,
  toggleWatchlistItemPin,
  setWatchlistItemTags,
  setWatchlistItemNote,
  setWatchlistViewPrefs,
} from './storage';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('watchlist storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearWatchlistStorage();
  });

  it('returns default state when storage is empty', () => {
    const state = loadWatchlistState();
    expect(state.version).toBe(1);
    expect(state.watchlists.length).toBe(1);
    expect(state.selectedSymbol).toBeNull();
  });

  it('round-trips saved state', () => {
    const withItem = addWatchlistItem(DEFAULT_WATCHLIST_STATE, {
      symbol: 'AAPL',
      name: 'Apple',
      exchange: 'NASDAQ',
    });
    saveWatchlistState(withItem);
    const loaded = loadWatchlistState();
    expect(loaded.watchlists[0].items[0].symbol).toBe('AAPL');
    expect(loaded.selectedSymbol).toBe('AAPL');
  });

  it('rejects malformed storage', () => {
    localStorageMock.setItem('tv-ai:watchlists:v1', '{bad json');
    expect(loadWatchlistState().watchlists.length).toBe(1);
  });

  it('rejects wrong version', () => {
    localStorageMock.setItem(
      'tv-ai:watchlists:v1',
      JSON.stringify({ version: 2, watchlists: [] }),
    );
    expect(loadWatchlistState().version).toBe(1);
  });

  it('dedupes symbols within a watchlist', () => {
    let state = addWatchlistItem(DEFAULT_WATCHLIST_STATE, {
      symbol: 'aapl',
      name: 'Apple',
      exchange: 'NASDAQ',
    });
    state = addWatchlistItem(state, {
      symbol: 'AAPL',
      name: 'Apple Inc',
      exchange: 'NASDAQ',
    });
    const list = state.watchlists[0];
    expect(list.items.length).toBe(1);
    expect(list.items[0].symbol).toBe('AAPL');
  });

  it('clears invalid selected symbol on load', () => {
    const withItem = addWatchlistItem(DEFAULT_WATCHLIST_STATE, {
      symbol: 'MSFT',
      name: 'Microsoft',
      exchange: 'NASDAQ',
    });
    saveWatchlistState({ ...withItem, selectedSymbol: 'GOOG' });
    const loaded = loadWatchlistState();
    expect(loaded.selectedSymbol).toBeNull();
  });

  it('removes items and clears selection when removed', () => {
    let state = addWatchlistItem(DEFAULT_WATCHLIST_STATE, {
      symbol: 'TSLA',
      name: 'Tesla',
      exchange: 'NASDAQ',
    });
    state = removeWatchlistItem(state, 'TSLA');
    expect(state.watchlists[0].items.length).toBe(0);
    expect(state.selectedSymbol).toBeNull();
  });

  it('selectWatchlistSymbol only selects existing symbols', () => {
    const withItem = addWatchlistItem(DEFAULT_WATCHLIST_STATE, {
      symbol: 'NVDA',
      name: 'NVIDIA',
      exchange: 'NASDAQ',
    });
    const selected = selectWatchlistSymbol(withItem, 'NVDA');
    expect(selected.selectedSymbol).toBe('NVDA');
    const invalid = selectWatchlistSymbol(withItem, 'FAKE');
    expect(invalid.selectedSymbol).toBeNull();
  });

  it('enforces max items cap', () => {
    let state = DEFAULT_WATCHLIST_STATE;
    for (let i = 0; i < MAX_WATCHLIST_ITEMS + 5; i++) {
      state = addWatchlistItem(state, {
        symbol: `SYM${i}`,
        name: `Symbol ${i}`,
        exchange: 'TEST',
      });
    }
    expect(state.watchlists[0].items.length).toBe(MAX_WATCHLIST_ITEMS);
  });

  it('createWatchlist adds a new active list', () => {
    const state = createWatchlist(DEFAULT_WATCHLIST_STATE, 'Growth');
    expect(state.watchlists.length).toBe(2);
    expect(getActiveWatchlist(state).name).toBe('Growth');
    expect(state.selectedSymbol).toBeNull();
  });

  it('createWatchlist dedupes duplicate names', () => {
    let state = createWatchlist(DEFAULT_WATCHLIST_STATE, 'Growth');
    state = createWatchlist(state, 'Growth');
    const names = state.watchlists.map((w) => w.name);
    expect(names).toContain('Growth');
    expect(names).toContain('Growth 2');
  });

  it('switchWatchlist updates active list and selected symbol', () => {
    const firstId = DEFAULT_WATCHLIST_STATE.watchlists[0].id;
    let state = createWatchlist(DEFAULT_WATCHLIST_STATE, 'Second');
    state = addWatchlistItem(state, { symbol: 'AAPL', name: 'Apple', exchange: 'NASDAQ' });
    const secondId = getActiveWatchlist(state).id;
    state = switchWatchlist(state, firstId);
    expect(state.activeWatchlistId).toBe(firstId);
    expect(state.selectedSymbol).toBeNull();
    state = switchWatchlist(state, secondId);
    expect(state.activeWatchlistId).toBe(secondId);
    expect(state.selectedSymbol).toBe('AAPL');
  });

  it('renameWatchlist trims and falls back to Watchlist', () => {
    const id = DEFAULT_WATCHLIST_STATE.watchlists[0].id;
    const renamed = renameWatchlist(DEFAULT_WATCHLIST_STATE, id, '  Momentum  ');
    expect(getActiveWatchlist(renamed).name).toBe('Momentum');
    const blank = renameWatchlist(DEFAULT_WATCHLIST_STATE, id, '   ');
    expect(getActiveWatchlist(blank).name).toBe('Watchlist');
  });

  it('duplicateWatchlist copies items without sharing arrays', () => {
    const id = DEFAULT_WATCHLIST_STATE.watchlists[0].id;
    let state = addWatchlistItem(DEFAULT_WATCHLIST_STATE, {
      symbol: 'NVDA',
      name: 'NVIDIA',
      exchange: 'NASDAQ',
    });
    state = duplicateWatchlist(state, id);
    const active = getActiveWatchlist(state);
    expect(active.name).toBe('Watchlist Copy');
    expect(active.items[0].symbol).toBe('NVDA');
    active.items.push({
      symbol: 'FAKE',
      addedAt: Date.now(),
    });
    expect(state.watchlists.find((w) => w.id === id)!.items.length).toBe(1);
  });

  it('clearWatchlist removes symbols from active list', () => {
    const id = DEFAULT_WATCHLIST_STATE.watchlists[0].id;
    let state = addWatchlistItem(DEFAULT_WATCHLIST_STATE, {
      symbol: 'TSLA',
      name: 'Tesla',
      exchange: 'NASDAQ',
    });
    state = clearWatchlist(state, id);
    expect(getActiveWatchlist(state).items.length).toBe(0);
    expect(state.selectedSymbol).toBeNull();
  });

  it('deleteWatchlist keeps at least one list', () => {
    const id = DEFAULT_WATCHLIST_STATE.watchlists[0].id;
    expect(deleteWatchlist(DEFAULT_WATCHLIST_STATE, id)).toBe(DEFAULT_WATCHLIST_STATE);
  });

  it('deleteWatchlist removes inactive list without changing active selection', () => {
    const firstId = DEFAULT_WATCHLIST_STATE.watchlists[0].id;
    let state = createWatchlist(DEFAULT_WATCHLIST_STATE, 'To Delete');
    const toDeleteId = getActiveWatchlist(state).id;
    state = switchWatchlist(state, firstId);
    state = addWatchlistItem(state, { symbol: 'MSFT', name: 'Microsoft', exchange: 'NASDAQ' });
    state = deleteWatchlist(state, toDeleteId);
    expect(state.watchlists.length).toBe(1);
    expect(state.activeWatchlistId).toBe(firstId);
    expect(state.selectedSymbol).toBe('MSFT');
  });

  it('deleteWatchlist switches to remaining list when active is deleted', () => {
    const firstId = DEFAULT_WATCHLIST_STATE.watchlists[0].id;
    let state = createWatchlist(DEFAULT_WATCHLIST_STATE, 'Second');
    const secondId = getActiveWatchlist(state).id;
    state = deleteWatchlist(state, secondId);
    expect(state.watchlists.length).toBe(1);
    expect(state.activeWatchlistId).toBe(firstId);
  });

  it('enforces max watchlists cap', () => {
    let state = DEFAULT_WATCHLIST_STATE;
    for (let i = 0; i < MAX_WATCHLISTS; i++) {
      state = createWatchlist(state);
    }
    expect(state.watchlists.length).toBe(MAX_WATCHLISTS);
    const capped = createWatchlist(state, 'One Too Many');
    expect(capped.watchlists.length).toBe(MAX_WATCHLISTS);
  });

  it('round-trips organization metadata and view prefs', () => {
    let state = addWatchlistItem(DEFAULT_WATCHLIST_STATE, {
      symbol: 'AAPL',
      name: 'Apple',
      exchange: 'NASDAQ',
      pinned: true,
      tags: ['Tech', 'Mega'],
      note: 'Watch 200 reclaim',
    });
    state = setWatchlistViewPrefs(state, state.activeWatchlistId, {
      groupMode: 'tags',
      visibleColumns: ['symbol', 'last', 'changePct', 'volume'],
    });
    saveWatchlistState(state);
    const loaded = loadWatchlistState();
    const item = loaded.watchlists[0].items[0];
    expect(item.pinned).toBe(true);
    expect(item.tags).toEqual(['Tech', 'Mega']);
    expect(item.note).toBe('Watch 200 reclaim');
    expect(loaded.watchlists[0].viewPrefs?.groupMode).toBe('tags');
  });

  it('updates pin, tags, and note helpers', () => {
    let state = addWatchlistItem(DEFAULT_WATCHLIST_STATE, {
      symbol: 'NVDA',
      name: 'NVIDIA',
      exchange: 'NASDAQ',
    });
    state = toggleWatchlistItemPin(state, 'NVDA');
    expect(getActiveWatchlist(state).items[0].pinned).toBe(true);
    state = setWatchlistItemTags(state, 'NVDA', ['AI', 'Semis']);
    expect(getActiveWatchlist(state).items[0].tags).toEqual(['AI', 'Semis']);
    state = setWatchlistItemNote(state, 'NVDA', 'Leader');
    expect(getActiveWatchlist(state).items[0].note).toBe('Leader');
  });

  it('addWatchlistItems bulk-adds with dedupe and cap', () => {
    const state = addWatchlistItems(DEFAULT_WATCHLIST_STATE, [
      { symbol: 'AAPL', name: 'Apple', exchange: 'NASDAQ' },
      { symbol: 'MSFT', name: 'Microsoft', exchange: 'NASDAQ' },
      { symbol: 'AAPL', name: 'Apple duplicate', exchange: 'NASDAQ' },
    ]);
    const active = getActiveWatchlist(state);
    expect(active.items.map((item) => item.symbol)).toEqual(['AAPL', 'MSFT']);
  });
});
