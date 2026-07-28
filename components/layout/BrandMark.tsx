import React from "react";
import { cn } from "../../lib/cn";

/**
 * The CryptoBay island logomark, kept from the original but given a solid
 * accent tile. The wordmark next to it is plain ink rather than clipped
 * gradient text — gradient wordmarks read as template chrome, and the clipped
 * text has no computable contrast ratio against the page.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-6 w-6 shrink-0 place-items-center rounded text-accent-ink shadow-xs",
        "bg-gradient-to-br from-accent to-accent-active",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
        <path d="M12 10c-.6 0-1 .4-1 1v7h2v-7c0-.6-.4-1-1-1z" fill="currentColor" />
        <path
          d="M12 9c1.8-2.5 4.6-3.2 7-2.2-1.9.6-3.4 1.5-4.4 2.6 2.4-.2 4.3.6 5.4 1.9-2.2-.7-4.2-.6-5.8.1 1.3 1.1 2 2.3 2.2 3.6-1.5-1.6-3.1-2.5-4.4-2.8-1.3.3-2.9 1.2-4.4 2.8.2-1.3.9-2.5 2.2-3.6-1.6-.7-3.6-.8-5.8-.1 1.1-1.3 3-2.1 5.4-1.9-1-1.1-2.5-2-4.4-2.6 2.4-1 5.2-.3 7 2.2z"
          fill="currentColor"
        />
        <path d="M5 20c0-1.7 3.1-3 7-3s7 1.3 7 3H5z" fill="currentColor" />
      </svg>
    </span>
  );
}
