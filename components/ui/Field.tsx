import React, { createContext, useContext, useId } from "react";
import { cn } from "../../lib/cn";

/**
 * Label / hint / error wrapper for form controls.
 *
 * The ids for the hint and error are generated here and handed to the control
 * through context, so `aria-describedby` and `aria-invalid` are always wired
 * correctly instead of being re-typed (and forgotten) at each call site.
 */

interface FieldContextValue {
  controlId: string;
  describedBy: string | undefined;
  invalid: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export function useFieldControl() {
  const ctx = useContext(FieldContext);
  return {
    id: ctx?.controlId,
    "aria-describedby": ctx?.describedBy,
    "aria-invalid": ctx?.invalid || undefined,
  } as const;
}

export interface FieldProps {
  label: string;
  /** Persistent helper text. Hidden while an error is showing. */
  hint?: string;
  /** Presence switches the control into its invalid state. */
  error?: string;
  /** Right-aligned secondary content in the label row (e.g. a Max button). */
  action?: React.ReactNode;
  /** Visually hide the label but keep it for assistive tech. */
  hideLabel?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Field({
  label,
  hint,
  error,
  action,
  hideLabel = false,
  className,
  children,
}: FieldProps) {
  const base = useId();
  const controlId = `${base}-control`;
  const hintId = `${base}-hint`;
  const errorId = `${base}-error`;

  const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <FieldContext.Provider
      value={{ controlId, describedBy: describedBy || undefined, invalid: Boolean(error) }}
    >
      <div className={cn("space-y-1.5", className)}>
        <div className={cn("flex items-baseline justify-between gap-2", hideLabel && "sr-only")}>
          <label htmlFor={controlId} className="text-xs font-medium text-ink-secondary">
            {label}
          </label>
          {action}
        </div>

        {children}

        {error ? (
          // `role="alert"` so a validation failure is announced as it appears.
          <p id={errorId} role="alert" className="flex items-start gap-1 text-xs text-negative">
            <span aria-hidden="true" className="mt-px">
              ⚠
            </span>
            <span>{error}</span>
          </p>
        ) : hint ? (
          <p id={hintId} className="text-xs text-ink-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}
