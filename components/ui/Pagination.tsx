import React from "react";
import { cn } from "../../lib/cn";
import { formatInteger } from "../../lib/format";

export interface PaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  /** Noun for the range readout, e.g. "assets". */
  itemLabel?: string;
  className?: string;
}

/**
 * Range readout plus previous/next.
 *
 * The readout is a polite live region, so moving pages is announced ("Showing
 * 11 to 20 of 50 assets") without the arrows needing labels that change. Page
 * numbers are deliberately omitted — with a handful of pages they add width and
 * tab stops without adding reach.
 */
export function Pagination({
  page,
  pageCount,
  pageSize,
  totalItems,
  onPageChange,
  itemLabel = "items",
  className,
}: PaginationProps) {
  const first = totalItems === 0 ? 0 : page * pageSize + 1;
  const last = Math.min((page + 1) * pageSize, totalItems);
  const canPrevious = page > 0;
  const canNext = page < pageCount - 1;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-between gap-3", className)}
    >
      <p aria-live="polite" className="text-xs text-ink-muted nums-tabular">
        Showing{" "}
        <span className="font-medium text-ink-secondary">
          {formatInteger(first)}–{formatInteger(last)}
        </span>{" "}
        of {formatInteger(totalItems)} {itemLabel}
      </p>

      <div className="flex items-center gap-1">
        <PageButton
          label="Previous page"
          disabled={!canPrevious}
          onClick={() => onPageChange(page - 1)}
        >
          <Chevron direction="left" />
        </PageButton>
        <span className="px-1 text-xs text-ink-muted nums-tabular">
          {page + 1} / {Math.max(pageCount, 1)}
        </span>
        <PageButton label="Next page" disabled={!canNext} onClick={() => onPageChange(page + 1)}>
          <Chevron direction="right" />
        </PageButton>
      </div>
    </nav>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "focus-ring grid h-6 w-6 place-items-center rounded text-ink-secondary",
        "ring-1 ring-inset ring-line transition-colors duration-fast",
        "hover:bg-surface-subtle hover:text-ink",
        "disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden="true">
      <path
        d={direction === "left" ? "m9.5 4-3.5 4 3.5 4" : "m6.5 4 3.5 4-3.5 4"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
