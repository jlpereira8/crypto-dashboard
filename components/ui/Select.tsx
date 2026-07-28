import React from "react";
import { cn } from "../../lib/cn";
import { useFieldControl } from "./Field";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  options: SelectOption[];
  size?: "md" | "lg";
  /** Leading adornment, e.g. a coin mark. */
  leading?: React.ReactNode;
  invalid?: boolean;
}

/**
 * Styled *native* select.
 *
 * A custom listbox would let us render coin logos in the options, but the native
 * control gets platform behaviour for free — the iOS wheel picker, type-ahead,
 * correct screen-reader semantics, and no focus-management bugs. For a form
 * control with a long option list that trade is worth more than the logos.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, size = "md", leading, invalid, className, disabled, ...props },
  ref,
) {
  const field = useFieldControl();
  const isInvalid = invalid ?? field["aria-invalid"] ?? undefined;

  return (
    <div
      className={cn(
        "relative flex items-center gap-2 rounded-lg bg-surface px-2.5",
        "ring-1 ring-inset transition-[box-shadow] duration-fast ease-out",
        isInvalid ? "ring-negative-edge" : "ring-line hover:ring-line-strong",
        "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus",
        size === "lg" ? "h-11" : "h-8",
        disabled && "opacity-50",
        className,
      )}
    >
      {leading && <span className="pointer-events-none shrink-0">{leading}</span>}

      <select
        ref={ref}
        id={field.id}
        aria-describedby={field["aria-describedby"]}
        aria-invalid={isInvalid}
        disabled={disabled}
        className={cn(
          "min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pr-5",
          "text-xs font-medium text-ink outline-none",
          "disabled:cursor-not-allowed",
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-ink-muted" />
    </div>
  );
});

export function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="m4 6 4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
