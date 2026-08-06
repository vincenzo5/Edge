"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import EdgeBorderLabeledControl from "./EdgeBorderLabeledControl";
import EdgeHelpIcon from "./EdgeHelpIcon";
import {
  fieldClass,
  type BorderLegendSurface,
  type FieldDensity,
} from "./styles";

export type EdgeLabeledInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  help?: string;
  labelSurface?: BorderLegendSurface;
  density?: FieldDensity;
  invalid?: boolean;
  testId?: string;
};

const EdgeLabeledInput = forwardRef<HTMLInputElement, EdgeLabeledInputProps>(
  function EdgeLabeledInput(
    {
      label,
      help,
      labelSurface = "panel",
      density = "standard",
      disabled,
      invalid,
      testId,
      className = "",
      ...rest
    },
    ref,
  ) {
    const labelId = useId();
    const legendLabel: ReactNode = help ? (
      <span className="inline-flex items-center gap-1">
        {label}
        <EdgeHelpIcon content={help} ariaLabel={`${label} help`} />
      </span>
    ) : (
      label
    );

    return (
      <EdgeBorderLabeledControl
        label={legendLabel}
        labelId={labelId}
        labelSurface={labelSurface}
        fullWidth
        className="w-full"
      >
        <input
          ref={ref}
          data-testid={testId}
          aria-labelledby={labelId}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={`${fieldClass({ density, disabled, invalid })} w-full min-w-0 ${className}`.trim()}
          {...rest}
        />
      </EdgeBorderLabeledControl>
    );
  },
);

export default EdgeLabeledInput;
