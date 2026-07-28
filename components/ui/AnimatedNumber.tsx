import React, { useEffect, useRef, useState } from "react";
import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/cn";
import { easing } from "../../lib/motion";

export interface AnimatedNumberProps {
  value: number | null | undefined;
  /** Must produce the final display string, including currency/suffix. */
  format: (value: number) => string;
  durationMs?: number;
  className?: string;
}

/**
 * Counts to a new value instead of snapping to it.
 *
 * The tween writes to `textContent` through a ref rather than through state, so
 * a 500ms animation costs zero React renders — with several of these on screen,
 * re-rendering each frame was the difference between smooth and janky.
 *
 * React only ever renders the *first* formatted value (held in state, so it is
 * referentially stable); every later value arrives via the ref. That keeps
 * React's virtual DOM from fighting the animation for ownership of the text.
 */
export function AnimatedNumber({
  value,
  format,
  durationMs = 500,
  className,
}: AnimatedNumberProps) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLSpanElement>(null);
  const hasValue = typeof value === "number" && Number.isFinite(value);
  const motionValue = useMotionValue(hasValue ? value : 0);

  // Keep the formatter in a ref so a new inline arrow function on each render
  // doesn't restart the animation.
  const formatRef = useRef(format);
  formatRef.current = format;

  const [initialText] = useState(() => (hasValue ? format(value) : "—"));

  useEffect(() => {
    const unsubscribe = motionValue.on("change", (latest) => {
      if (ref.current) ref.current.textContent = formatRef.current(latest);
    });
    return unsubscribe;
  }, [motionValue]);

  useEffect(() => {
    if (!hasValue) {
      if (ref.current) ref.current.textContent = "—";
      return;
    }
    if (reduced) {
      motionValue.jump(value);
      if (ref.current) ref.current.textContent = formatRef.current(value);
      return;
    }
    const controls = animate(motionValue, value, {
      duration: durationMs / 1000,
      ease: easing.out,
    });
    return () => controls.stop();
  }, [value, hasValue, reduced, durationMs, motionValue]);

  return (
    <span ref={ref} className={cn(className)}>
      {initialText}
    </span>
  );
}
