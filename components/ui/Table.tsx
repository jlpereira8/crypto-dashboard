import React from "react";
import { cn } from "../../lib/cn";

export type SortDirection = "asc" | "desc";

/* ── Scroll container ────────────────────────────────────────────────────── */

/**
 * Wraps a table in its own scroll area so the sticky header pins against the
 * panel, not the page. `maxHeight` bounds the area; without it the header has
 * nothing to stick within.
 */
export function TableScroll({
  maxHeight,
  className,
  children,
}: {
  maxHeight?: number | string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("scrollbar-slim relative overflow-auto overscroll-x-contain", className)}
      style={maxHeight ? { maxHeight } : undefined}
    >
      {children}
    </div>
  );
}

export function Table({
  className,
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn("w-full border-collapse text-left text-sm", className)} {...props}>
      {children}
    </table>
  );
}

/**
 * Sticky header.
 *
 * Opaque on the raised surface, not a translucent blur — rows sliding under a
 * semi-transparent header is the classic sticky-table artefact. The bottom
 * hairline is a box-shadow because a `border` on a sticky `<th>` doesn't travel
 * with it.
 */
export function TableHead({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-10",
        "[&_th]:bg-surface-raised [&_th]:shadow-[inset_0_-1px_0_var(--color-border)]",
        className,
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  // `line-subtle`, not `line`: at 40px row height a full-strength rule on every
  // row reads as a spreadsheet grid and competes with the numbers.
  return (
    <tbody className={cn("divide-y divide-line-subtle", className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableCell({
  align = "left",
  className,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" }) {
  return (
    <td
      className={cn(
        // Denser: 8px vertical padding puts rows at ~40px instead of ~46px.
        "whitespace-nowrap px-3 py-2 text-ink first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5",
        align === "right" && "text-right",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

/* ── Headers ─────────────────────────────────────────────────────────────── */

const HEADER_BASE = cn(
  "whitespace-nowrap px-3 py-2 text-micro font-medium uppercase text-ink-muted",
  "first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5",
);

export function TableHeaderCell({
  align = "left",
  className,
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={cn(HEADER_BASE, align === "right" && "text-right", className)}
      {...props}
    >
      {children}
    </th>
  );
}

export interface SortableHeaderCellProps {
  label: string;
  /** Spoken column name, when `label` is a glyph like "#". */
  srLabel?: string;
  /** Current direction if this column is the active sort, else null. */
  direction: SortDirection | null;
  onSort: () => void;
  align?: "left" | "right";
  className?: string;
}

/**
 * Sortable column header.
 *
 * `aria-sort` on the `<th>` is what assistive tech reads; the caret is a
 * decorative echo of it. The inactive caret stays visible at low opacity rather
 * than appearing on hover, so the affordance is discoverable without a pointer,
 * and the button's accessible name spells out what activating it will do.
 */
export function SortableHeaderCell({
  label,
  srLabel,
  direction,
  onSort,
  align = "left",
  className,
}: SortableHeaderCellProps) {
  const ariaSort = direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none";
  const nextAction =
    direction === "desc"
      ? "sort ascending"
      : direction === "asc"
        ? "remove sorting"
        : "sort descending";

  // `className` goes on the <th>, not the button: it carries column sizing
  // hints like `w-14`, which would be inert on the w-full button nested inside.
  return (
    <th scope="col" aria-sort={ariaSort} className={cn(HEADER_BASE, "p-0", className)}>
      <button
        type="button"
        onClick={onSort}
        className={cn(
          "focus-ring-inset group inline-flex w-full items-center gap-1 px-3 py-2",
          "transition-colors duration-fast hover:text-ink",
          align === "right" ? "justify-end" : "justify-start",
          direction && "text-ink",
        )}
      >
        <span aria-hidden={srLabel ? "true" : undefined}>{label}</span>
        {srLabel && <span className="sr-only">{srLabel}</span>}
        <span className="sr-only">, {nextAction}</span>
        <SortCaret direction={direction} />
      </button>
    </th>
  );
}

function SortCaret({ direction }: { direction: SortDirection | null }) {
  return (
    <svg
      viewBox="0 0 10 10"
      className={cn(
        "h-2 w-2 shrink-0 transition-[opacity,transform] duration-fast ease-out",
        direction ? "opacity-90" : "opacity-25 group-hover:opacity-50",
        direction === "asc" && "rotate-180",
      )}
      aria-hidden="true"
    >
      <path d="M5 8 1 3h8L5 8Z" fill="currentColor" />
    </svg>
  );
}
