"use client";

import {
  useId,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import EdgeBorderLabeledControl from "../design-system/EdgeBorderLabeledControl";
import EdgeHelpIcon from "../design-system/EdgeHelpIcon";
import EdgeLabeledInput, { type EdgeLabeledInputProps } from "../design-system/EdgeLabeledInput";
import EdgeReadout from "../design-system/EdgeReadout";
import { annotationTextClass, fieldClass, type FieldDensity } from "../design-system/styles";
import {
  POLICY_EDITOR_SECTION_COPY,
  type PolicyEditorSectionId,
} from "./policyEditorCopy";

export function PolicyEditorLegendLabel({ label, help }: { label: string; help?: string }) {
  if (!help) return label;
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <EdgeHelpIcon content={help} ariaLabel={`${label} help`} />
    </span>
  );
}

type LabeledControlProps = {
  label: string;
  help?: string;
  density?: FieldDensity;
  className?: string;
};

type PolicyScalarFieldProps = {
  label: string;
  help?: string;
  readOnly?: boolean;
  disabled?: boolean;
  testId?: string;
  emptyReadout?: ReactNode;
};

export type PolicyTextFieldProps = PolicyScalarFieldProps &
  Omit<EdgeLabeledInputProps, "label" | "help" | "disabled" | "testId">;

function formatPolicyReadoutValue(
  value: string | number | readonly string[] | undefined,
  emptyReadout: ReactNode,
): ReactNode {
  if (value == null || value === "") return emptyReadout;
  return value;
}

export function PolicyTextField({
  label,
  help,
  readOnly,
  disabled,
  testId,
  value,
  emptyReadout = "—",
  ...rest
}: PolicyTextFieldProps) {
  if (readOnly) {
    return (
      <EdgeReadout
        label={label}
        help={help}
        value={formatPolicyReadoutValue(value, emptyReadout)}
        testId={testId}
      />
    );
  }

  return (
    <EdgeLabeledInput
      label={label}
      help={help}
      value={value}
      disabled={disabled}
      testId={testId}
      {...rest}
    />
  );
}

export type PolicyNumberFieldProps = PolicyTextFieldProps;

export function PolicyNumberField(props: PolicyNumberFieldProps) {
  return <PolicyTextField type="number" {...props} />;
}

export function renderPolicyField(props: PolicyTextFieldProps): ReactNode {
  if (props.type === "number") {
    return <PolicyNumberField {...props} />;
  }
  return <PolicyTextField {...props} />;
}

export function PolicyEditorLabeledTextarea({
  label,
  help,
  density = "standard",
  className = "",
  disabled,
  readOnly,
  testId,
  ...rest
}: LabeledControlProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & { readOnly?: boolean; testId?: string }) {
  const labelId = useId();
  const resolvedTestId =
    testId ??
    (typeof (rest as { "data-testid"?: unknown })["data-testid"] === "string"
      ? ((rest as { "data-testid"?: string })["data-testid"] as string)
      : undefined);

  if (readOnly) {
    return (
      <EdgeReadout
        label={label}
        help={help}
        value={formatPolicyReadoutValue(rest.value, "—")}
        testId={resolvedTestId}
      />
    );
  }

  return (
    <EdgeBorderLabeledControl
      label={<PolicyEditorLegendLabel label={label} help={help} />}
      labelId={labelId}
      fullWidth
      className="w-full"
    >
      <textarea
        aria-labelledby={labelId}
        disabled={disabled}
        className={`${fieldClass({ density, disabled })} w-full min-w-0 ${className}`.trim()}
        {...rest}
      />
    </EdgeBorderLabeledControl>
  );
}

export function PolicyEditorLabeledSelect({
  label,
  help,
  density = "standard",
  className = "",
  disabled,
  children,
  ...rest
}: LabeledControlProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const labelId = useId();

  return (
    <EdgeBorderLabeledControl
      label={<PolicyEditorLegendLabel label={label} help={help} />}
      labelId={labelId}
      fullWidth
      className="w-full"
    >
      <select
        aria-labelledby={labelId}
        disabled={disabled}
        className={`${fieldClass({ density, disabled })} w-full min-w-0 ${className}`.trim()}
        {...rest}
      >
        {children}
      </select>
    </EdgeBorderLabeledControl>
  );
}

export function PolicyEditorSectionHeader({ sectionId }: { sectionId: PolicyEditorSectionId }) {
  const copy = POLICY_EDITOR_SECTION_COPY[sectionId];

  return (
    <p
      className={`flex items-start gap-1.5 ${annotationTextClass()} leading-relaxed text-[var(--edge-text-secondary)]`}
      data-testid={`policy-editor-section-header-${sectionId}`}
    >
      <span>{copy.blurb}</span>
      <EdgeHelpIcon content={copy.help} ariaLabel={`${copy.label} section help`} />
    </p>
  );
}

export function PolicyEditorFieldLegend({
  label,
  help,
}: {
  label: string;
  help?: string;
}) {
  return (
    <span className="mb-1 flex items-center gap-1 text-[var(--edge-text-secondary)]">
      {label}
      {help ? <EdgeHelpIcon content={help} ariaLabel={`${label} help`} /> : null}
    </span>
  );
}
