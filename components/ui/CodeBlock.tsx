import React, { useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useCopyToClipboard } from "../../lib/useCopyToClipboard";

export interface CodeSample {
  /** Tab label, e.g. "JavaScript". */
  language: string;
  code: string;
}

export interface CodeBlockProps {
  samples: CodeSample[];
  /** Filename or endpoint shown in the header. */
  caption?: string;
  className?: string;
}

/**
 * Code viewer with language tabs and copy-to-clipboard.
 *
 * No syntax highlighter: shipping Prism or Shiki for a handful of snippets would
 * cost more than every other page on this route combined. A monospace block on a
 * recessed surface reads perfectly well, and the copy button is what people
 * actually came for.
 *
 * Code is rendered as a text child, never through `innerHTML`.
 */
export function CodeBlock({ samples, caption, className }: CodeBlockProps) {
  const [active, setActive] = useState(0);
  const { copied, copy } = useCopyToClipboard();

  const current = samples[Math.min(active, samples.length - 1)];
  const lines = useMemo(() => current?.code.split("\n") ?? [], [current]);

  if (!current) return null;

  return (
    <figure
      className={cn(
        "overflow-hidden rounded-lg bg-surface-subtle ring-1 ring-inset ring-line",
        className,
      )}
    >
      <figcaption className="flex items-center gap-2 border-b border-line px-2.5 py-1.5">
        {samples.length > 1 ? (
          <div role="tablist" aria-label="Code language" className="flex items-center gap-0.5">
            {samples.map((sample, index) => (
              <button
                key={sample.language}
                type="button"
                role="tab"
                aria-selected={index === active}
                onClick={() => setActive(index)}
                className={cn(
                  "focus-ring rounded px-1.5 py-0.5 text-micro font-medium uppercase",
                  "transition-colors duration-fast",
                  index === active
                    ? "bg-surface text-ink shadow-xs"
                    : "text-ink-muted hover:text-ink-secondary",
                )}
              >
                {sample.language}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-micro font-medium uppercase text-ink-muted">
            {caption ?? current.language}
          </span>
        )}

        {samples.length > 1 && caption && (
          <span className="truncate text-micro text-ink-muted">{caption}</span>
        )}

        <button
          type="button"
          onClick={() => void copy(current.code)}
          className={cn(
            "focus-ring ml-auto shrink-0 rounded px-1.5 py-0.5 text-micro font-medium",
            "transition-colors duration-fast",
            copied ? "text-positive" : "text-ink-muted hover:text-ink",
          )}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </figcaption>

      <div className="scrollbar-slim overflow-x-auto">
        <pre className="px-3 py-2.5 text-xs leading-relaxed">
          <code className="font-mono text-ink-secondary">
            {lines.map((line, index) => (
              <span key={index} className="block whitespace-pre">
                {line || " "}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </figure>
  );
}
