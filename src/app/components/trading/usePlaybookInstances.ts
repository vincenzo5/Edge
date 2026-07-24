"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchPlaybookInstances } from "@/lib/trading/tradingClient";
import type { PlaybookInstance } from "@/lib/trading/playbook/types";

export function usePlaybookInstances(accountId: string | null | undefined) {
  const [instances, setInstances] = useState<PlaybookInstance[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const normalized = accountId?.trim();
    if (!normalized) {
      setInstances([]);
      return;
    }
    setLoading(true);
    try {
      const next = await fetchPlaybookInstances(normalized, { activeOnly: true });
      setInstances(next);
    } catch {
      setInstances([]);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { instances, loading, refresh };
}
