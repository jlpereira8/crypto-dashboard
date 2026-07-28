import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTheme } from "../../lib/useTheme";
import { transition, withReducedMotion } from "../../lib/motion";
import { Button, Tooltip } from "../ui";

/**
 * Light/dark switch.
 *
 * `aria-pressed` describes the *state*, and the accessible name describes the
 * action ("Switch to dark theme") — the original had a static "Toggle dark mode"
 * label plus a nested `<span class="sr-only">Toggle theme</span>`, so screen
 * readers announced two competing names and never the current state.
 */
export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const reduced = useReducedMotion() ?? false;
  const label = `Switch to ${isDark ? "light" : "dark"} theme`;

  return (
    <Tooltip content={label}>
      <Button
        variant="ghost"
        iconOnly
        aria-label={label}
        aria-pressed={isDark}
        onClick={toggleTheme}
      >
        <span className="relative grid h-4 w-4 place-items-center">
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={isDark ? "moon" : "sun"}
              initial={reduced ? { opacity: 0 } : { opacity: 0, rotate: -45, scale: 0.7 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, rotate: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, rotate: 45, scale: 0.7 }}
              transition={withReducedMotion(transition.fast, reduced)}
              className="absolute inset-0 grid place-items-center"
            >
              {isDark ? <MoonIcon /> : <SunIcon />}
            </motion.span>
          </AnimatePresence>
        </span>
      </Button>
    </Tooltip>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="3" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M12.95 3.05l-1.06 1.06M4.11 11.89l-1.06 1.06" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14 9.5A6.5 6.5 0 0 1 6.5 2a6.5 6.5 0 1 0 7.5 7.5Z"
      />
    </svg>
  );
}
