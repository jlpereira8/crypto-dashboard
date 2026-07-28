import React from "react";
import { cn } from "../../lib/cn";

const VARIANTS = {
  primary: cn(
    "bg-accent text-accent-ink shadow-xs",
    "hover:bg-accent-hover active:bg-accent-active",
  ),
  secondary: cn(
    "bg-surface text-ink ring-1 ring-inset ring-line-strong shadow-xs",
    "hover:bg-surface-hover hover:ring-line-strong",
  ),
  ghost: "text-ink-secondary hover:bg-surface-subtle hover:text-ink",
  subtle: "bg-surface-subtle text-ink hover:bg-line",
  danger: cn(
    "bg-negative-soft text-negative ring-1 ring-inset ring-negative-line",
    "hover:bg-negative-soft hover:ring-negative-edge",
  ),
} as const;

const SIZES = {
  sm: "h-7 gap-1.5 px-2 text-xs rounded",
  md: "h-8 gap-1.5 px-3 text-xs rounded-lg",
  lg: "h-10 gap-2 px-4 text-sm rounded-lg",
} as const;

const ICON_SIZES = {
  sm: "h-7 w-7 rounded",
  md: "h-8 w-8 rounded-lg",
  lg: "h-10 w-10 rounded-lg",
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  /** Square button — requires `aria-label`, since there is no text to read. */
  iconOnly?: boolean;
  /** Shows a spinner and blocks interaction without collapsing the width. */
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

/** Internal: shared class computation for Button. */
function buttonStyles({
  variant = "secondary",
  size = "md",
  iconOnly = false,
  fullWidth = false,
  className,
}: Pick<ButtonProps, "variant" | "size" | "iconOnly" | "fullWidth" | "className"> = {}) {
  return cn(
    "focus-ring relative inline-flex select-none items-center justify-center whitespace-nowrap",
    "font-medium transition-[background-color,box-shadow,color,transform] duration-fast ease-out",
    // A 1% scale-down on press: too small to notice, enough to feel connected.
    "active:scale-[0.985]",
    "disabled:pointer-events-none disabled:opacity-45 disabled:active:scale-100",
    iconOnly ? ICON_SIZES[size] : SIZES[size],
    VARIANTS[variant],
    fullWidth && "w-full",
    className,
  );
}

/**
 * `loading` keeps the label mounted (invisible) rather than replacing it, so the
 * button doesn't change width mid-interaction and shift the layout around it.
 * `aria-busy` plus `disabled` communicates the state without a live region.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    iconOnly = false,
    loading = false,
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    className,
    children,
    disabled,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, iconOnly, fullWidth, className })}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner />
        </span>
      )}
      <span
        className={cn(
          "inline-flex items-center",
          iconOnly ? "" : size === "sm" ? "gap-1.5" : "gap-2",
          loading && "invisible",
        )}
      >
        {leadingIcon}
        {children}
        {trailingIcon}
      </span>
    </button>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4 animate-spin", className)}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path
        d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
