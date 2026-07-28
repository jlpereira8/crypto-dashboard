import type { Transition, Variants } from "framer-motion";

/**
 * Motion tokens. Durations are in seconds (Framer Motion's unit) and mirror the
 * `transitionDuration` scale in tailwind.config.js so CSS transitions and
 * animated components share one vocabulary.
 *
 * Every consumer wraps these with `useReducedMotion()` — see `withReducedMotion`.
 */
export const duration = {
  fast: 0.12,
  base: 0.18,
  slow: 0.28,
  slower: 0.45,
} as const;

export const easing = {
  /** Decelerate — entrances, the default for anything appearing. */
  out: [0.16, 1, 0.3, 1],
  /** Symmetric — position changes and reversible toggles. */
  inOut: [0.65, 0, 0.35, 1],
} as const;

export const spring = {
  /** Panels and drawers: settles quickly, no visible bounce. */
  panel: { type: "spring", stiffness: 420, damping: 38, mass: 0.9 },
  /** Small affordances that benefit from a hint of overshoot. */
  snappy: { type: "spring", stiffness: 560, damping: 32, mass: 0.6 },
} satisfies Record<string, Transition>;

export const transition = {
  fast: { duration: duration.fast, ease: easing.out },
  base: { duration: duration.base, ease: easing.out },
  slow: { duration: duration.slow, ease: easing.out },
} satisfies Record<string, Transition>;

/** Collapses any transition to ~instant when the user asked for reduced motion. */
export function withReducedMotion<T extends Transition>(t: T, reduced: boolean): Transition {
  return reduced ? { duration: 0 } : t;
}

/* ── Shared variants ─────────────────────────────────────────────────────── */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

/**
 * Staggered container for dashboard sections. Children opt in with `fadeUp`.
 * Stagger is deliberately short — long cascades feel slow on repeat visits.
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

export const overlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const popover: Variants = {
  hidden: { opacity: 0, y: -4, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

export const modalPanel: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
};
