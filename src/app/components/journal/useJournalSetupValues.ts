"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_JOURNAL_SETUP_VALUES,
  readJournalSetupValues,
  subscribeJournalSetupValues,
  type JournalSetupValues,
} from "@/lib/journal/journalSetupPreference";

let snapshotCache: JournalSetupValues = [...DEFAULT_JOURNAL_SETUP_VALUES];
let snapshotCacheKey = JSON.stringify(snapshotCache);

function getSnapshot(): JournalSetupValues {
  const values = readJournalSetupValues();
  const key = JSON.stringify(values);
  if (key !== snapshotCacheKey) {
    snapshotCache = values;
    snapshotCacheKey = key;
  }
  return snapshotCache;
}

function getServerSnapshot(): JournalSetupValues {
  return snapshotCache;
}

function subscribe(onStoreChange: () => void) {
  return subscribeJournalSetupValues((values) => {
    snapshotCache = values;
    snapshotCacheKey = JSON.stringify(values);
    onStoreChange();
  });
}

export function useJournalSetupValues(): JournalSetupValues {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export {
  addJournalSetupValue,
  removeJournalSetupValue,
  renameJournalSetupValue,
  reorderJournalSetupValues,
  resetJournalSetupValues,
  journalSetupSelectOptions,
} from "@/lib/journal/journalSetupPreference";
