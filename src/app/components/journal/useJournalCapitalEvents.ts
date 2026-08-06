"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_JOURNAL_CAPITAL_EVENTS,
  readJournalCapitalEvents,
  subscribeJournalCapitalEvents,
  type JournalCapitalEvents,
} from "@/lib/journal/journalCapitalPreference";

let snapshotCache: JournalCapitalEvents = [...DEFAULT_JOURNAL_CAPITAL_EVENTS];
let snapshotCacheKey = JSON.stringify(snapshotCache);

function getSnapshot(): JournalCapitalEvents {
  const events = readJournalCapitalEvents();
  const key = JSON.stringify(events);
  if (key !== snapshotCacheKey) {
    snapshotCache = events;
    snapshotCacheKey = key;
  }
  return snapshotCache;
}

function getServerSnapshot(): JournalCapitalEvents {
  return snapshotCache;
}

function subscribe(onStoreChange: () => void) {
  return subscribeJournalCapitalEvents((events) => {
    snapshotCache = events;
    snapshotCacheKey = JSON.stringify(events);
    onStoreChange();
  });
}

export function useJournalCapitalEvents(): JournalCapitalEvents {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export {
  addJournalCapitalEvent,
  removeJournalCapitalEvent,
  resetJournalCapitalEvents,
  sumJournalNetDeposits,
} from "@/lib/journal/journalCapitalPreference";
