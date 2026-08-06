"use client";

import { useCallback, useRef, type KeyboardEvent } from "react";
import { bodyTextClass, compactControlClass, underlineTabClass } from "./styles";

export type EdgeUnderlineSegment = {
  id: string;
  label: string;
  disabled?: boolean;
  testId?: string;
};

type Props = {
  segments: EdgeUnderlineSegment[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  /** `content` — shrink-to-fit (default). `stretch` — equal-width tabs across full row. */
  layout?: "content" | "stretch";
};

export default function EdgeUnderlineTabs({
  segments,
  value,
  onChange,
  className = "",
  layout = "content",
}: Props) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const enabledIndices = segments
    .map((segment, index) => (segment.disabled ? -1 : index))
    .filter((index) => index >= 0);

  const focusSegmentAt = useCallback(
    (index: number) => {
      const enabled = enabledIndices;
      if (enabled.length === 0) return;
      const currentPos = enabled.indexOf(index);
      const nextPos =
        currentPos >= 0
          ? currentPos
          : enabled.findIndex((itemIndex) => segments[itemIndex]?.id === value);
      const targetIndex = enabled[Math.max(0, nextPos)] ?? enabled[0]!;
      tabRefs.current[targetIndex]?.focus();
    },
    [enabledIndices, segments, value],
  );

  const moveFocus = (direction: 1 | -1) => {
    const enabled = enabledIndices;
    if (enabled.length === 0) return;
    const activeIndex = segments.findIndex((segment) => segment.id === value);
    const currentPos = Math.max(0, enabled.indexOf(activeIndex));
    const nextPos = (currentPos + direction + enabled.length) % enabled.length;
    const nextIndex = enabled[nextPos]!;
    onChange(segments[nextIndex]!.id);
    tabRefs.current[nextIndex]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        moveFocus(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        moveFocus(-1);
        break;
      case "Home":
        event.preventDefault();
        if (enabledIndices[0] != null) {
          onChange(segments[enabledIndices[0]!]!.id);
          tabRefs.current[enabledIndices[0]!]?.focus();
        }
        break;
      case "End":
        event.preventDefault();
        if (enabledIndices.at(-1) != null) {
          const lastIndex = enabledIndices.at(-1)!;
          onChange(segments[lastIndex]!.id);
          tabRefs.current[lastIndex]?.focus();
        }
        break;
      default:
        break;
    }
  };

  const stretch = layout === "stretch";

  return (
    <div
      className={`flex items-end ${stretch ? "w-full" : "shrink-0 gap-4"} ${className}`.trim()}
      role="tablist"
      onKeyDown={onKeyDown}
    >
      {segments.map((segment, index) => {
        const active = segment.id === value;
        return (
          <button
            key={segment.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={segment.disabled}
            onClick={() => onChange(segment.id)}
            onFocus={() => focusSegmentAt(index)}
            data-testid={segment.testId}
            className={`edge-focus-ring -mb-px flex min-h-[var(--edge-control-height-compact)] items-center px-0.5 pb-1.5 ${compactControlClass()} ${bodyTextClass()} motion-safe:transition-colors ${underlineTabClass(active)} ${
              stretch ? "min-w-0 flex-1 justify-center" : "inline-flex shrink-0"
            } ${segment.disabled ? "cursor-not-allowed opacity-40" : ""}`.trim()}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
