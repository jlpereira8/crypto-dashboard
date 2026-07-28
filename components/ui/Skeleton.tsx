import React from "react";
import { cn } from "../../lib/cn";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  /** `text` rounds to the line box; `circle` for avatars and coin marks. */
  shape?: "rect" | "text" | "circle";
};

/**
 * Loading placeholder. The shimmer is a masked gradient sweep rather than an
 * opacity pulse — it reads as "content arriving" instead of "something is
 * blinking", and the reduced-motion rule in globals.css stops it entirely.
 *
 * Always `aria-hidden`: the live region that owns the loading state announces
 * it once, instead of every placeholder shouting.
 */
export function Skeleton({ className, shape = "rect", ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden bg-surface-subtle",
        shape === "circle" && "rounded-full",
        shape === "text" && "rounded h-[1em]",
        shape === "rect" && "rounded-lg",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-sheen to-transparent" />
    </div>
  );
}

