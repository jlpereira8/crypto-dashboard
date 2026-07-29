import React, { useCallback, useId, useMemo, useState } from "react";
import Head from "next/head";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "../lib/cn";
import {
  ALL_SECTIONS,
  DOC_GROUPS,
  searchDocs,
  type DocBlock,
  type DocSection,
} from "../lib/docs-content";
import { fadeUp, transition, withReducedMotion } from "../lib/motion";
import {
  Callout,
  CodeBlock,
  EmptyState,
  Input,
  SearchIcon,
  StatLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableScroll,
} from "../components/ui";

/**
 * Documentation hub.
 *
 * A single route with in-page section switching rather than one file per topic:
 * the content is a typed data structure, so a route per section would be a lot of
 * near-identical files that render the same component. Navigation, search and
 * breadcrumbs all read from that structure.
 */
export default function DocsPage() {
  const [activeId, setActiveId] = useState(ALL_SECTIONS[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const searchId = `${useId()}-docs-search`;
  const reduced = useReducedMotion() ?? false;

  const results = useMemo(() => searchDocs(query), [query]);
  const isSearching = query.trim().length > 0;

  const active = useMemo(
    () => ALL_SECTIONS.find((section) => section.id === activeId) ?? ALL_SECTIONS[0],
    [activeId],
  );

  const activeGroup = useMemo(
    () => DOC_GROUPS.find((group) => group.sections.some((section) => section.id === active?.id)),
    [active],
  );

  const open = useCallback((id: string) => {
    setActiveId(id);
    setQuery("");
  }, []);

  return (
    <>
      <Head>
        <title>Documentation — CryptoBay</title>
        <meta
          name="description"
          content="How CryptoBay is built: quick start, architecture, design tokens, components, accessibility and testing."
        />
      </Head>

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* ── Docs sidebar ─────────────────────────────────────────────────── */}
        <aside
          aria-label="Documentation sections"
          className={cn(
            "border-b border-line bg-canvas p-3",
            "lg:sticky lg:top-12 lg:h-[calc(100vh-3rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r",
            "scrollbar-slim",
          )}
        >
          <label htmlFor={searchId} className="sr-only">
            Search documentation
          </label>
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search docs"
            leading={<SearchIcon />}
          />

          <nav className="mt-3 space-y-4">
            {DOC_GROUPS.map((group) => (
              <div key={group.label}>
                <StatLabel className="px-2 pb-1">{group.label}</StatLabel>
                <ul className="space-y-0.5">
                  {group.sections.map((section) => {
                    const current = section.id === active?.id && !isSearching;
                    return (
                      <li key={section.id}>
                        <button
                          type="button"
                          aria-current={current ? "page" : undefined}
                          onClick={() => open(section.id)}
                          className={cn(
                            "focus-ring block w-full truncate rounded px-2 py-1.5 text-left text-xs font-medium",
                            "transition-colors duration-fast",
                            current
                              ? "bg-accent-soft text-accent-text"
                              : "text-ink-secondary hover:bg-surface-subtle hover:text-ink",
                          )}
                        >
                          {section.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div className="min-w-0 bg-surface">
          {isSearching ? (
            <section aria-label="Search results" className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                {results.length > 0
                  ? `${results.length} result${results.length === 1 ? "" : "s"}`
                  : "No results"}
              </h2>
              <p className="mt-1 text-xs text-ink-muted">
                Searching for “{query.trim()}”
              </p>

              {results.length === 0 ? (
                <EmptyState
                  className="mt-4"
                  icon={<SearchIcon />}
                  title="Nothing matches that"
                  description="Try a component name, a script, or a term like tokens, charts or testing."
                />
              ) : (
                <ul className="mt-4 space-y-2">
                  {results.map(({ section, group }) => (
                    <li key={section.id}>
                      <button
                        type="button"
                        onClick={() => open(section.id)}
                        className={cn(
                          "focus-ring block w-full rounded-lg p-3 text-left",
                          "ring-1 ring-inset ring-line transition-colors duration-fast",
                          "hover:bg-surface-hover hover:ring-line-strong",
                        )}
                      >
                        <span className="text-micro font-medium uppercase text-ink-muted">
                          {group}
                        </span>
                        <span className="mt-0.5 block text-sm font-medium text-ink">
                          {section.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-secondary">
                          {section.summary}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            active && (
              <AnimatePresence mode="wait" initial={false}>
                <motion.article
                  key={active.id}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={withReducedMotion(transition.base, reduced)}
                  className="px-4 py-5 sm:px-6 sm:py-6"
                >
                  {/* Breadcrumb */}
                  <nav aria-label="Breadcrumb">
                    <ol className="flex flex-wrap items-center gap-1.5 text-micro uppercase text-ink-muted">
                      <li>Docs</li>
                      <li aria-hidden="true">/</li>
                      <li>{activeGroup?.label}</li>
                      <li aria-hidden="true">/</li>
                      <li className="font-medium text-accent-text">{active.title}</li>
                    </ol>
                  </nav>

                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                    {active.title}
                  </h2>
                  <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-secondary">
                    {active.summary}
                  </p>

                  <div className="mt-5 max-w-3xl space-y-4">
                    {active.blocks.map((block, index) => (
                      <DocBlockView key={index} block={block} />
                    ))}
                  </div>

                  <SectionPager activeId={active.id} onOpen={open} />
                </motion.article>
              </AnimatePresence>
            )
          )}
        </div>
      </div>
    </>
  );
}

/** Renders one content block. Prose supports `**bold**` and `` `code` `` only. */
function DocBlockView({ block }: { block: DocBlock }) {
  switch (block.kind) {
    case "prose":
      return <p className="text-sm leading-relaxed text-ink-secondary">{inline(block.text ?? "")}</p>;

    case "code":
      return <CodeBlock samples={block.samples ?? []} caption={block.caption} />;

    case "callout":
      return (
        <Callout tone={block.tone ?? "info"} title={block.title}>
          {inline(block.text ?? "")}
        </Callout>
      );

    case "list":
      return (
        <ul className="space-y-1.5">
          {(block.items ?? []).map((item, index) => (
            <li key={index} className="flex gap-2 text-sm leading-relaxed text-ink-secondary">
              <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
              <span>{inline(item)}</span>
            </li>
          ))}
        </ul>
      );

    case "table":
      return (
        <div className="overflow-hidden rounded-lg ring-1 ring-inset ring-line">
          <TableScroll>
            <Table>
              <TableHead>
                <tr>
                  {(block.columns ?? []).map((column) => (
                    <TableHeaderCell key={column}>{column}</TableHeaderCell>
                  ))}
                </tr>
              </TableHead>
              <TableBody>
                {(block.rows ?? []).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <TableCell
                        key={cellIndex}
                        className={cn(
                          "whitespace-normal text-xs",
                          cellIndex === 0
                            ? "font-mono font-medium text-ink"
                            : "text-ink-secondary",
                        )}
                      >
                        {inline(cell)}
                      </TableCell>
                    ))}
                  </tr>
                ))}
              </TableBody>
            </Table>
          </TableScroll>
        </div>
      );

    default:
      return null;
  }
}

/**
 * Minimal inline formatting for `**bold**` and `` `code` ``.
 *
 * Deliberately a tokeniser producing React nodes rather than a markdown parser
 * writing HTML: content stays text, so there is no path from a string to
 * `innerHTML`, and it costs no dependency.
 */
function inline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={index}
          className="rounded bg-surface-subtle px-1 py-0.5 font-mono text-[0.9em] text-ink"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/** Previous / next across the flattened section order. */
function SectionPager({
  activeId,
  onOpen,
}: {
  activeId: string;
  onOpen: (id: string) => void;
}) {
  const index = ALL_SECTIONS.findIndex((section) => section.id === activeId);
  const previous = index > 0 ? ALL_SECTIONS[index - 1] : null;
  const next = index >= 0 && index < ALL_SECTIONS.length - 1 ? ALL_SECTIONS[index + 1] : null;

  if (!previous && !next) return null;

  return (
    <nav aria-label="Section navigation" className="mt-8 grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
      {previous ? <PagerLink section={previous} direction="Previous" onOpen={onOpen} /> : <span />}
      {next && <PagerLink section={next} direction="Next" onOpen={onOpen} align="right" />}
    </nav>
  );
}

function PagerLink({
  section,
  direction,
  onOpen,
  align = "left",
}: {
  section: DocSection;
  direction: string;
  onOpen: (id: string) => void;
  align?: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(section.id)}
      className={cn(
        "focus-ring rounded-lg p-3 ring-1 ring-inset ring-line",
        "transition-colors duration-fast hover:bg-surface-hover hover:ring-line-strong",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      <span className="block text-micro uppercase text-ink-muted">{direction}</span>
      <span className="mt-0.5 block text-sm font-medium text-accent-text">{section.title}</span>
    </button>
  );
}
