'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EventBadgeGroup } from './engine/eventBadges';
import type { EventDetailAnchor } from './components/EventDetailCard';

export type EventDetailControllerDeps = {
  symbol: string;
  candleSessionKey: string;
  selectedEventBadgeIdProp?: string | null;
  onEventBadgeClick?: (
    group: EventBadgeGroup,
    pos: { clientX: number; clientY: number; plotX: number; plotY: number },
  ) => void;
  onEventBadgeHover?: (group: EventBadgeGroup | null) => void;
  onEventBadgeMore?: (group: EventBadgeGroup) => void;
};

export type EventDetailController = {
  effectiveSelectedEventBadgeId: string | null;
  eventDetailGroup: EventBadgeGroup | null;
  eventDetailAnchor: EventDetailAnchor | null;
  handleEventBadgeClick: (
    group: EventBadgeGroup,
    pos: { clientX: number; clientY: number; plotX: number; plotY: number },
  ) => void;
  handleEventBadgeHover: (group: EventBadgeGroup | null) => void;
  handleEventDetailClose: () => void;
  handleEventBadgeMore: (group: EventBadgeGroup) => void;
};

export function useEventDetailController(deps: EventDetailControllerDeps): EventDetailController {
  const {
    symbol,
    candleSessionKey,
    selectedEventBadgeIdProp = null,
    onEventBadgeClick,
    onEventBadgeHover,
    onEventBadgeMore,
  } = deps;

  const [selectedEventBadgeId, setSelectedEventBadgeId] = useState<string | null>(null);
  const [eventDetailGroup, setEventDetailGroup] = useState<EventBadgeGroup | null>(null);
  const [eventDetailAnchor, setEventDetailAnchor] = useState<EventDetailAnchor | null>(null);

  const effectiveSelectedEventBadgeId = selectedEventBadgeIdProp ?? selectedEventBadgeId;

  useEffect(() => {
    setSelectedEventBadgeId(null);
    setEventDetailGroup(null);
    setEventDetailAnchor(null);
  }, [symbol, candleSessionKey]);

  const handleEventBadgeClick = useCallback(
    (
      group: EventBadgeGroup,
      pos: { clientX: number; clientY: number; plotX: number; plotY: number },
    ) => {
      if (onEventBadgeClick) {
        onEventBadgeClick(group, pos);
        return;
      }
      setSelectedEventBadgeId(group.id);
      setEventDetailGroup(group);
      setEventDetailAnchor(pos);
    },
    [onEventBadgeClick],
  );

  const handleEventBadgeHover = useCallback(
    (group: EventBadgeGroup | null) => {
      onEventBadgeHover?.(group);
    },
    [onEventBadgeHover],
  );

  const handleEventDetailClose = useCallback(() => {
    setSelectedEventBadgeId(null);
    setEventDetailGroup(null);
    setEventDetailAnchor(null);
  }, []);

  const handleEventBadgeMore = useCallback(
    (group: EventBadgeGroup) => {
      onEventBadgeMore?.(group);
    },
    [onEventBadgeMore],
  );

  return {
    effectiveSelectedEventBadgeId,
    eventDetailGroup,
    eventDetailAnchor,
    handleEventBadgeClick,
    handleEventBadgeHover,
    handleEventDetailClose,
    handleEventBadgeMore,
  };
}
