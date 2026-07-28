import React, { useCallback, useId, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/cn";
import { spring, withReducedMotion } from "../../lib/motion";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Appended to the accessible name, e.g. "past 7 days". */
  description?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible group name — required, there is no visible legend. */
  label: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Single-choice control built on the radiogroup pattern: arrow keys move
 * selection, and only the checked option is in the tab order, so the control
 * costs one Tab stop rather than one per segment.
 *
 * The selection indicator is a shared `layoutId`, so it slides between segments
 * instead of cross-fading.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
}: SegmentedControlProps<T>) {
  const groupId = useId();
  const reduced = useReducedMotion() ?? false;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = useCallback(
    (from: number, delta: number) => {
      const next = (from + delta + options.length) % options.length;
      onChange(options[next].value);
      refs.current[next]?.focus();
    },
    [onChange, options],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          move(index, 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          move(index, -1);
          break;
        case "Home":
          event.preventDefault();
          move(index, -index);
          break;
        case "End":
          event.preventDefault();
          move(index, options.length - 1 - index);
          break;
      }
    },
    [move, options.length],
  );

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex items-center rounded-lg bg-surface-subtle p-[3px]",
        "ring-1 ring-inset ring-line-subtle",
        className,
      )}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            // Roving tabindex: the group is a single stop, arrows do the rest.
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "focus-ring relative rounded font-medium tracking-normal transition-colors duration-fast ease-out",
              size === "sm" ? "h-[1.375rem] px-1.5 text-micro" : "h-6 px-2 text-2xs",
              selected ? "text-ink" : "text-ink-muted hover:text-ink-secondary",
            )}
          >
            {selected && (
              <motion.span
                layoutId={`${groupId}-indicator`}
                className="absolute inset-0 rounded bg-surface shadow-xs ring-1 ring-line"
                transition={withReducedMotion(spring.snappy, reduced)}
              />
            )}
            <span className="relative">{option.label}</span>
            {option.description && <span className="sr-only"> — {option.description}</span>}
          </button>
        );
      })}
    </div>
  );
}
