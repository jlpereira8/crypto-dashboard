import { useCallback, useSyncExternalStore } from "react";

/**
 * Theme state, backed by the `dark` class on <html>.
 *
 * One external store rather than per-component state: the DOM class *is* the
 * state, so the toggle, the charts and the browser chrome can't drift apart.
 *
 * **Dark is the product default.** A first-time visitor gets dark regardless of
 * their OS setting — this is a trading interface, and dark is the house style. The
 * OS preference is therefore not consulted at all, which is a deliberate trade:
 * ignoring an explicit system choice is normally user-hostile, and the mitigation
 * is that one click on the toggle persists the opposite forever.
 */

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
export const DEFAULT_THEME: Theme = "dark";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/**
 * Which theme to start in.
 *
 * Pure and exported so the rule is testable — the blocking script below is a
 * string and can't be unit tested, so this is the copy that gets verified.
 */
export function resolveInitialTheme(stored: string | null): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return DEFAULT_THEME;
}

function subscribe(listener: () => void) {
  // No `prefers-color-scheme` listener: the OS preference is not part of the
  // resolution, so reacting to it would contradict the default.
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Server render assumes the default. The blocking script corrects it before first
 * paint for anyone with a stored preference, so there is no flash — and matching
 * the default here keeps SSR output aligned with the common case.
 */
function getServerSnapshot(): Theme {
  return DEFAULT_THEME;
}

/** Must track --color-canvas in globals.css. */
const CHROME_COLOR: Record<Theme, string> = {
  dark: "#08090b",
  light: "#f7f7f8",
};

/**
 * Keeps the browser chrome in step with the page.
 *
 * This owns the tag outright — creating it when absent — rather than updating one
 * declared in `next/head`. The blocking script runs while the head is still
 * parsing, so a statically declared meta isn't reliably in the DOM yet, and the
 * first update silently did nothing.
 *
 * A single JS-driven tag also replaces two `prefers-color-scheme`-scoped ones,
 * which would describe the wrong colour now that the theme is class-driven and
 * ignores the OS.
 */
function syncThemeColor(theme: Theme) {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", CHROME_COLOR[theme]);
}

function applyTheme(next: Theme) {
  document.documentElement.classList.toggle("dark", next === "dark");
  syncThemeColor(next);
  emit();
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* preference simply won't persist */
    }
    applyTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(getSnapshot() === "dark" ? "light" : "dark");
  }, [setTheme]);

  return { theme, isDark: theme === "dark", setTheme, toggleTheme };
}

/**
 * Inlined into <head> so the class and the chrome colour are set before the first
 * paint. Mirrors `resolveInitialTheme` — keep the two in step.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("${STORAGE_KEY}");var d=s!=="light";document.documentElement.classList.toggle("dark",d);var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.setAttribute("name","theme-color");document.head.appendChild(m)}m.setAttribute("content",d?"${CHROME_COLOR.dark}":"${CHROME_COLOR.light}")}catch(e){document.documentElement.classList.add("dark")}})();`;
