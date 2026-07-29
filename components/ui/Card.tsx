import React from "react";
import { cn } from "../../lib/cn";

const PADDING = {
  none: "",
  sm: "p-3",
  md: "p-3.5",
  lg: "p-4 sm:p-5",
} as const;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: keyof typeof PADDING;
  /** Adds a hover response. Only for panels that are themselves a target. */
  interactive?: boolean;
  /**
   * Dim while fresh data loads underneath. Preferred over swapping in a
   * skeleton on refetch — no layout jump, no flash.
   */
  refreshing?: boolean;
}

/**
 * A panel, not a card.
 *
 * Visual weight moved from elevation to the edge: a hairline ring carries the
 * separation and the shadow is nearly nothing. That is most of what makes a
 * dense dashboard read as an instrument rather than a stack of floating tiles.
 *
 * The hover response is now a CSS transition rather than a Framer Motion
 * component. This is the most-instantiated element on the page, and a
 * border/shadow change doesn't need a JS animation loop.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding = "lg", interactive = false, refreshing = false, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      aria-busy={refreshing || undefined}
      className={cn(
        "relative rounded-2xl bg-surface ring-1 ring-line shadow-card",
        "transition-[box-shadow,opacity] duration-base ease-out",
        refreshing && "opacity-[0.55]",
        interactive && "hover:shadow-card-hover hover:ring-line-strong",
        PADDING[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

/* ── Slots ───────────────────────────────────────────────────────────────── */

/**
 * Header row. `bleed` pulls it out of a padded panel so its bottom rule spans
 * the full width, and sets it on the raised surface so it reads as a toolbar
 * rather than as more content.
 *
 * A bleeding header must round its own top corners: Card carries the radius but
 * cannot clip its children (an `overflow-hidden` there would cut off the tooltips
 * some headers contain), so an opaque full-width band would otherwise paint square
 * corners over it. `inherit` takes Card's own radius, so the two can never drift.
 */
export function CardHeader({
  className,
  bleed = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { bleed?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5",
        bleed && "rounded-t-[inherit] border-b border-line bg-surface-raised px-4 py-2.5 sm:px-5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Panel heading. Purely typographic, so the workspace regions reuse it for their
 * own header bands rather than restating the type styles.
 */
export function CardTitle({
  as: Tag = "h2",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { as?: "h1" | "h2" | "h3" | "h4" }) {
  return (
    <Tag className={cn("text-sm font-semibold tracking-tight text-ink", className)} {...props}>
      {children}
    </Tag>
  );
}

/** Subtitle under a CardTitle. Owns the spacing so call sites don't repeat it. */
export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-0.5 text-xs text-ink-muted", className)} {...props}>
      {children}
    </p>
  );
}

/** Right-hand slot in a header, for filters and actions. */
export function CardToolbar({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex shrink-0 items-center gap-1.5", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * Micro-label above a value — the workhorse of a dense financial layout. Small,
 * uppercase, widely tracked, and recessive enough that the number beside it
 * carries all the weight.
 */
export function StatLabel({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <span
      className={cn("block text-micro font-medium uppercase text-ink-muted", className)}
      {...props}
    >
      {children}
    </span>
  );
}
