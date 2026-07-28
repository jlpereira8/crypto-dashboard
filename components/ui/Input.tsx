import React from "react";
import { cn } from "../../lib/cn";
import { useFieldControl } from "./Field";

const SIZES = {
  md: "h-8 text-xs",
  lg: "h-11 text-lg",
} as const;

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: keyof typeof SIZES;
  /** Leading adornment — an icon or a currency mark. */
  leading?: React.ReactNode;
  /** Trailing adornment — a unit or ticker. */
  trailing?: React.ReactNode;
  invalid?: boolean;
  /** Right-align the value. For numeric entry, where digits should line up. */
  alignEnd?: boolean;
}

/**
 * The focus ring sits on the wrapper (`focus-within`) rather than the input, so
 * the whole control including its adornments reads as one focused element.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = "md", leading, trailing, invalid, alignEnd, className, ...props },
  ref,
) {
  const field = useFieldControl();
  const isInvalid = invalid ?? field["aria-invalid"] ?? undefined;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg bg-surface px-2.5",
        "ring-1 ring-inset transition-[box-shadow,background-color] duration-fast ease-out",
        isInvalid ? "ring-negative-edge" : "ring-line hover:ring-line-strong",
        "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus",
        SIZES[size],
        className,
      )}
    >
      {leading && <span className="shrink-0 text-ink-muted">{leading}</span>}
      <input
        ref={ref}
        id={field.id}
        aria-describedby={field["aria-describedby"]}
        aria-invalid={isInvalid}
        className={cn(
          "min-w-0 flex-1 bg-transparent font-medium text-ink outline-none",
          "placeholder:font-normal placeholder:text-ink-muted",
          // Chrome's spinners fight right-aligned numeric entry.
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          alignEnd && "text-right nums-tabular",
        )}
        {...props}
      />
      {trailing && (
        <span className="shrink-0 text-xs font-medium text-ink-muted">{trailing}</span>
      )}
    </div>
  );
});
