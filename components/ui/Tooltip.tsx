import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/cn";
import { popover, transition, withReducedMotion } from "../../lib/motion";

export interface TooltipProps {
  content: React.ReactNode;
  side?: "top" | "bottom";
  /** Hover delay in ms. Keyboard focus is always immediate. */
  delayMs?: number;
  children: React.ReactElement;
  className?: string;
}

/**
 * Hover/focus tooltip.
 *
 * Shows on pointer hover after a short delay and on keyboard focus immediately —
 * a delay on focus feels broken when you are tabbing. Escape dismisses it
 * without moving focus. The child gets `aria-describedby`, so the content is
 * announced as part of the trigger rather than as a separate stray node.
 *
 * Supplementary only: nothing in this app is reachable *only* through a tooltip.
 */
export function Tooltip({ content, side = "top", delayMs = 250, children, className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = `${useId()}-tooltip`;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useReducedMotion() ?? false;

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const show = useCallback(
    (immediate: boolean) => {
      clear();
      if (immediate) setOpen(true);
      else timer.current = setTimeout(() => setOpen(true), delayMs);
    },
    [clear, delayMs],
  );

  const hide = useCallback(() => {
    clear();
    setOpen(false);
  }, [clear]);

  useEffect(() => clear, [clear]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, hide]);

  const trigger = React.cloneElement(children, {
    "aria-describedby": open ? tooltipId : undefined,
  } as React.HTMLAttributes<HTMLElement>);

  return (
    <span
      className="relative inline-flex"
      // focus/blur bubble in React, so the child's focus is caught here.
      onPointerEnter={() => show(false)}
      onPointerLeave={hide}
      onFocus={() => show(true)}
      onBlur={hide}
    >
      {trigger}

      <AnimatePresence>
        {open && (
          <motion.span
            id={tooltipId}
            role="tooltip"
            className={cn(
              "pointer-events-none absolute left-1/2 z-50 w-max max-w-[16rem] -translate-x-1/2",
              "rounded-lg bg-ink px-2 py-1 text-2xs font-medium tracking-normal text-surface shadow-pop",
              side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
              className,
            )}
            variants={popover}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={withReducedMotion(transition.fast, reduced)}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
