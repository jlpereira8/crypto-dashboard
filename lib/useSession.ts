import { useCallback, useSyncExternalStore } from "react";

/**
 * A local, front-end-only session.
 *
 * There is no backend and no authentication here: signing in records who you said
 * you were in this browser and nothing leaves the page. That is the whole
 * mechanism, and the dialog says so — the point is to exercise the signed-in UI,
 * not to imply an account system that doesn't exist.
 *
 * Same external-store shape as `useWatchlist`, for the same reason: the sidebar and
 * the dialog must never disagree about who is signed in, which two components
 * holding their own `useState` would eventually do.
 */

const STORAGE_KEY = "session";

export type SessionProvider = "email" | "google" | "apple";

export interface Session {
  provider: SessionProvider;
  /** What to show as the identity. The email for email sign-in. */
  name: string;
  /** Secondary line — the provider, or the address behind the name. */
  detail: string;
}

const PROVIDER_LABEL: Record<SessionProvider, string> = {
  email: "Email",
  google: "Google",
  apple: "Apple",
};

let cache: Session | null = null;
/** `undefined` means "not read yet", distinct from the `null` a missing key gives. */
let cacheRaw: string | null | undefined;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep other tabs in step.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cacheRaw = undefined;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function isProvider(value: unknown): value is SessionProvider {
  return value === "email" || value === "google" || value === "apple";
}

function read(): Session | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private-mode Safari throws on access.
    return cache;
  }

  // Cache against the raw string so the snapshot reference stays stable —
  // returning a fresh object each call would spin useSyncExternalStore forever.
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;

  if (!raw) {
    cache = null;
    return cache;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      isProvider((parsed as Session).provider) &&
      typeof (parsed as Session).name === "string" &&
      typeof (parsed as Session).detail === "string"
    ) {
      cache = parsed as Session;
    } else {
      // Anything we can't validate is treated as signed out rather than trusted.
      cache = null;
    }
  } catch {
    cache = null;
  }
  return cache;
}

/** SSR has no storage; the shell renders as a guest and corrects on hydration. */
function getServerSnapshot(): Session | null {
  return null;
}

function write(next: Session | null) {
  try {
    if (next === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* the session simply won't persist */
  }
  cacheRaw = undefined;
  cache = next;
  emit();
}

/** Good enough to catch a typo; deliberately not an RFC-5322 parser. */
export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(trimmed);
}

/**
 * Builds the session a provider produces.
 *
 * Google and Apple deliberately get a generic name: without a real OAuth exchange
 * we don't know who signed in, and inventing a plausible person would be
 * fabricating identity. Email is different — we know exactly what was typed.
 */
export function buildSession(provider: SessionProvider, email?: string): Session {
  if (provider === "email") {
    const address = (email ?? "").trim();
    return { provider, name: address, detail: "Demo session · this browser" };
  }
  return {
    provider,
    name: "Demo user",
    detail: `${PROVIDER_LABEL[provider]} · demo session`,
  };
}

export function useSession() {
  const session = useSyncExternalStore(subscribe, read, getServerSnapshot);

  const signIn = useCallback((provider: SessionProvider, email?: string) => {
    write(buildSession(provider, email));
  }, []);

  const signOut = useCallback(() => write(null), []);

  return { session, isSignedIn: session !== null, signIn, signOut };
}
