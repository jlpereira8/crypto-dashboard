import React from "react";
import { cn } from "../../lib/cn";

export interface PageHeaderProps {
  /** Small uppercase kicker above the title. */
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  /** Right-aligned controls. */
  actions?: React.ReactNode;
  /** Rendered below the description — breadcrumbs, tabs, meta rows. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * The band every route opens with.
 *
 * Renders an `<h2>`, not an `<h1>`: the app shell's top bar already carries the
 * page's single `<h1>` (the section name), so a second one here would give every
 * page two top-level headings. Visual size is set independently of level.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "border-b border-line bg-surface px-4 py-5 sm:px-6 sm:py-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 max-w-2xl">
          {eyebrow && (
            <p className="text-micro font-medium uppercase text-accent-text">{eyebrow}</p>
          )}
          <h2
            className={cn(
              "text-xl font-semibold tracking-tight text-ink sm:text-2xl",
              eyebrow && "mt-1",
            )}
          >
            {title}
          </h2>
          {description && (
            <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/**
 * Content region below a PageHeader. `padded` is the default; pass `false` for
 * children that manage their own edges, like a full-bleed table.
 */
export function PageSection({
  title,
  description,
  actions,
  padded = true,
  className,
  children,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  padded?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("border-b border-line bg-surface", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pb-2 pt-4 sm:px-6">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(padded && "px-4 py-4 sm:px-6")}>{children}</div>
    </section>
  );
}
