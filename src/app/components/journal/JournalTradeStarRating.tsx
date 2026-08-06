"use client";

import { useState } from "react";

type Props = {
  value: number | null;
  onChange: (value: number | null) => void;
  testId?: string;
  disabled?: boolean;
};

const MAX_STARS = 5;

export default function JournalTradeStarRating({
  value,
  onChange,
  testId = "journal-trade-rating",
  disabled = false,
}: Props) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? value ?? 0;

  return (
    <div
      className="flex items-center gap-0.5"
      data-testid={testId}
      onMouseLeave={() => setHoverValue(null)}
    >
      {Array.from({ length: MAX_STARS }, (_, index) => {
        const starValue = index + 1;
        const filled = starValue <= displayValue;
        return (
          <button
            key={starValue}
            type="button"
            disabled={disabled}
            className={`edge-focus-ring rounded px-0.5 text-lg leading-none transition-colors ${
              filled
                ? "text-[var(--edge-accent-blue)]"
                : "text-[var(--edge-text-muted)] hover:text-[var(--edge-text-secondary)]"
            } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
            aria-label={`Rate ${starValue} ${starValue === 1 ? "star" : "stars"}`}
            aria-pressed={value === starValue}
            data-testid={`${testId}-star-${starValue}`}
            data-filled={filled ? "true" : "false"}
            onMouseEnter={() => {
              if (!disabled) setHoverValue(starValue);
            }}
            onClick={() => {
              if (disabled) return;
              onChange(value === starValue ? null : starValue);
            }}
          >
            {filled ? "★" : "☆"}
          </button>
        );
      })}
    </div>
  );
}
