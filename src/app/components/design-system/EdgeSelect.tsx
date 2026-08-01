"use client";

import { useId, useRef, useState } from "react";
import EdgeAnchoredPopover from "./EdgeAnchoredPopover";
import EdgeBorderLabeledControl from "./EdgeBorderLabeledControl";
import EdgeMenuItem from "./EdgeMenuItem";
import EdgeMenuSectionHeader from "./EdgeMenuSectionHeader";
import {
  fieldClass,
  headerChipClass,
  type BorderLegendSurface,
  type FieldDensity,
} from "./styles";

export type EdgeSelectOption<T extends string = string> = {
  value: T;
  label: string;
  disabled?: boolean;
  description?: string;
};

export type EdgeSelectSection<T extends string = string> = {
  label?: string;
  options: EdgeSelectOption<T>[];
};

type BaseProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  label?: string;
  labelSurface?: BorderLegendSurface;
  density?: FieldDensity;
  variant?: "chip" | "field";
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  testId?: string;
  "aria-label"?: string;
  align?: "start" | "end";
  minWidth?: number;
  className?: string;
};

type FlatProps<T extends string> = BaseProps<T> & {
  options: EdgeSelectOption<T>[];
  sections?: never;
};

type SectionProps<T extends string> = BaseProps<T> & {
  sections: EdgeSelectSection<T>[];
  options?: never;
};

export type EdgeSelectProps<T extends string = string> = FlatProps<T> | SectionProps<T>;

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2 6.5L5 9.5L10 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden
      className={`shrink-0 text-[var(--edge-text-secondary)] motion-safe:transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M2 3.5L5 6.5L8 3.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function flattenOptions<T extends string>(props: EdgeSelectProps<T>): EdgeSelectOption<T>[] {
  if ("sections" in props && props.sections) {
    return props.sections.flatMap((section) => section.options);
  }
  return props.options ?? [];
}

export default function EdgeSelect<T extends string = string>(props: EdgeSelectProps<T>) {
  const {
    value,
    onChange,
    label,
    labelSurface,
    density = "standard",
    variant = "field",
    disabled,
    invalid,
    placeholder = "Select…",
    testId,
    "aria-label": ariaLabel,
    align = "start",
    minWidth = 180,
    className = "",
  } = props;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const labelId = useId();

  const flatOptions = flattenOptions(props);
  const selectedOption = flatOptions.find((option) => option.value === value);
  const displayLabel = selectedOption?.label ?? placeholder;

  const close = () => setOpen(false);

  const handleSelect = (optionValue: T) => {
    onChange(optionValue);
    close();
  };

  const fieldMinWidth = density === "compact" ? "min-w-0" : "min-w-[8rem]";
  const triggerClass =
    variant === "chip"
      ? `${headerChipClass(disabled)} min-w-[5rem] bg-transparent ${className}`.trim()
      : `${fieldClass({ density, disabled, invalid })} inline-flex w-auto ${fieldMinWidth} justify-between gap-2 ${className}`.trim();

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      data-testid={testId}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-labelledby={label ? labelId : undefined}
      aria-label={!label ? ariaLabel : undefined}
      disabled={disabled}
      className={`edge-focus-ring ${triggerClass}`}
      onClick={() => {
        if (!disabled) setOpen((current) => !current);
      }}
    >
      <span className="min-w-0 flex-1 truncate text-left">{displayLabel}</span>
      <ChevronIcon open={open} />
    </button>
  );

  const renderOptions = (options: EdgeSelectOption<T>[], keyPrefix: string) =>
    options.map((option) => (
      <EdgeMenuItem
        key={`${keyPrefix}-${option.value}`}
        label={option.label}
        selected={option.value === value}
        disabled={option.disabled}
        trailing={
          option.value === value ? (
            <CheckIcon />
          ) : option.description ? (
            <span className="text-[var(--edge-text-muted)]">{option.description}</span>
          ) : undefined
        }
        testId={testId ? `${testId}-option-${option.value}` : undefined}
        onClick={() => handleSelect(option.value)}
      />
    ));

  const menuContent =
    "sections" in props && props.sections ? (
      props.sections.map((section, index) => (
        <div key={section.label ?? `section-${index}`}>
          {section.label ? <EdgeMenuSectionHeader label={section.label} /> : null}
          {renderOptions(section.options, section.label ?? String(index))}
          {index < props.sections!.length - 1 ? (
            <div className="my-1 border-t border-[var(--edge-border-subtle)]" aria-hidden />
          ) : null}
        </div>
      ))
    ) : (
      renderOptions(flatOptions, "flat")
    );

  const popover = (
    <EdgeAnchoredPopover
      open={open}
      anchorRef={triggerRef}
      onClose={close}
      align={align}
      minWidth={minWidth}
      role="menu"
      enableMenuKeyboardNav
    >
      {menuContent}
    </EdgeAnchoredPopover>
  );

  if (label) {
    const surface = labelSurface ?? "panel";
    return (
      <EdgeBorderLabeledControl
        label={label}
        labelId={labelId}
        labelSurface={surface}
        className={variant === "field" ? "w-full" : undefined}
      >
        {trigger}
        {popover}
      </EdgeBorderLabeledControl>
    );
  }

  return (
    <>
      {trigger}
      {popover}
    </>
  );
}
