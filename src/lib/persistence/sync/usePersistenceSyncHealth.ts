"use client";

import { useEffect, useMemo, useState } from "react";
import type { PersistenceSyncHealthInput } from "@/lib/marketData/healthDatasets";
import {
  buildPersistenceSyncHealthInput,
  subscribePersistenceSyncAggregate,
  type PersistenceSyncAggregate,
} from "./persistenceSyncHealth";

export function usePersistenceSyncHealth(): PersistenceSyncHealthInput {
  const [aggregate, setAggregate] = useState<PersistenceSyncAggregate>({
    conflict: false,
    authBlocked: false,
    error: false,
    lastError: null,
  });

  useEffect(() => subscribePersistenceSyncAggregate(setAggregate), []);

  return useMemo(() => buildPersistenceSyncHealthInput(aggregate), [aggregate]);
}
