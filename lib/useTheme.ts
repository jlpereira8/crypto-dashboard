import { useCallback, useSyncExternalStore } from "react";

/**
 * Theme state, backed by the `dark` class on <html>.
 *
 * Previously the theme was read independently in three places (the toggle's
 * own `useState`, a `MutationObserver` inside the sparkline card, and the
 * blocking script in _app), which meant charts could disagree with the toggle.
 * This is now one external store: the DOM class is the state, and every
 * consumer subscribes to the same source via `useSyncExternalStore`.
 *
 * Charts no longer read this at all — they reference CSS custom properties, so
 * they re-theme without a React render.
 */

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  // Track OS-level changes too, but only while no explicit choice is stored.
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMediaChange = () => {
    if (readStoredPreference() === null) {
      applyTheme(media.matches ? "dark" : "light");
    }
  };
  media.addEventListener("change", onMediaChange);

  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onMediaChange);
  };
}

function readStoredPreference(): Theme | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    // Private-mode Safari throws on localStorage access.
    return null;
  }
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Server render always assumes light; the blocking script in _app corrects it
 *  before first paint, so there is no flash and no hydration mismatch. */
function getServerSnapshot(): Theme {
  return "light";
}

function applyTheme(next: Theme) {
  document.documentElement.classList.toggle("dark", next === "dark");
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
 * Inlined into <head> so the class is set before the first paint. Kept next to
 * the hook it has to agree with.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("${STORAGE_KEY}");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})();`;
