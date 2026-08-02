"use client";

import { compactControlClass, fieldClass, type FieldDensity } from "./styles";

export type EdgeFlipChipOption<T extends string = string> = {
  value: T;
  label: string;
};

export type EdgeFlipChipTone = "neutral" | "positive" | "negative";

export type EdgeFlipChipProps<T extends string = string> = {
  value: T;
  options: readonly [EdgeFlipChipOption<T>, EdgeFlipChipOption<T>];
  onChange: (value: T) => void;
  ariaLabel: string;
  tone?: EdgeFlipChipTone | ((value: T) => EdgeFlipChipTone);
  density?: FieldDensity;
  disabled?: boolean;
  testId?: string;
  className?: string;
};

function toneClass(tone: EdgeFlipChipTone): string {
  if (tone === "positive") {
    return "border-[color-mix(in_srgb,var(--edge-positive)_55%,var(--edge-border))] text-[var(--edge-positive)] bg-[color-mix(in_srgb,var(--edge-positive)_10%,var(--edge-surface-panel))]";
  }
  if (tone === "negative") {
    return "border-[color-mix(in_srgb,var(--edge-negative)_55%,var(--edge-border))] text-[var(--edge-negative)] bg-[color-mix(in_srgb,var(--edge-negative)_10%,var(--edge-surface-panel))]";
  }
  return "";
}

export default function EdgeFlipChip<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  tone = "neutral",
  density = "compact",
  disabled = false,
  testId,
  className = "",
}: EdgeFlipChipProps<T>) {
  const current = options.find((option) => option.value === value) ?? options[0];
  const resolvedTone = typeof tone === "function" ? tone(current.value) : tone;
  const baseField = fieldClass({ density, disabled });
  const tint = toneClass(resolvedTone);

  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={`${ariaLabel}: ${current.label}. Activate to switch.`}
      disabled={disabled}
      className={`edge-focus-ring ${compactControlClass()} justify-center px-[var(--edge-space-2)] font-medium ${baseField} ${tint} ${className}`.trim()}
      onClick={() => {
        const next = options[0].value === current.value ? options[1] : options[0];
        onChange(next.value);
      }}
    >
      {current.label}
    </button>
  );
}
