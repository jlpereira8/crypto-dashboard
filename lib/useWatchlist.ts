import { useCallback, useSyncExternalStore } from "react";

/**
 * The user's watchlist, persisted to localStorage.
 *
 * An external store rather than component state, so every row's star and the
 * "Watchlist" filter always agree — two components reading the same key with
 * their own `useState` would drift the moment either updated.
 *
 * Reads never write. A first-time visitor gets `DEFAULT_WATCHLIST` returned
 * without touching storage; the list is only persisted once they actually toggle
 * something, which is the point at which it stops being a default and becomes
 * theirs. Seeding inside the read path would also be a side effect in a function
 * React is free to call more than once.
 *
 * Server snapshot is deliberately empty: localStorage does not exist during SSR,
 * and a mismatch here would produce a hydration error on every row.
 */

const STORAGE_KEY = "watchlist";

/**
 * What a first-time visitor sees.
 *
 * Without these the panel opens on an empty state, which makes a dashboard look
 * unfinished rather than personal. All five are verified members of the top 50, so
 * they resolve to real rows — the panel silently drops ids it can't find, and a
 * typo here would show as a mysteriously short list.
 *
 * Deliberately only a partial overlap with the sample portfolio: a watchlist that
 * mirrors the holdings panel beside it would add nothing.
 */
export const DEFAULT_WATCHLIST: readonly string[] = Object.freeze([
  "btc-bitcoin",
  "eth-ethereum",
  "sol-solana",
  "ada-cardano",
  "doge-dogecoin",
]);

let cache: readonly string[] = DEFAULT_WATCHLIST;
/**
 * `undefined` means "not read yet", which has to be distinct from the `null`
 * localStorage returns for a missing key — otherwise the first read would match
 * the initial cache and hand back a stale value.
 */
let cacheRaw: string | null | undefined;
const listeners = new Set<() => void>();

function read(): readonly string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return cache;
  }

  // Cache by raw string so getSnapshot returns a stable reference; returning a
  // fresh array each call would make useSyncExternalStore loop forever.
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;

  // The key's *absence* is what means "first visit". A present-but-empty value
  // means the user emptied the list on purpose, so the defaults must not come
  // back — seeding on "falsy" instead of "absent" is how that bug happens.
  if (raw === null) {
    cache = DEFAULT_WATCHLIST;
    return cache;
  }

  if (raw === "") {
    cache = [];
    return cache;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    cache = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: readonly string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private-mode Safari throws; keep the in-memory value so the UI still works.
  }
  cacheRaw = JSON.stringify(next);
  cache = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep other tabs in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cacheRaw = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: readonly string[] = [];

export function useWatchlist() {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY);

  const toggle = useCallback((id: string) => {
    const current = read();
    write(current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const clear = useCallback(() => write([]), []);

  /**
   * Puts the starter set back.
   *
   * An emptied list stays empty across reloads, which is the right default — but
   * without this there is no way out of it, so anyone who experimented with the
   * stars and ended at zero would be stuck on an empty panel forever. Restoring
   * has to be an explicit action, never something a reload does on its own.
   */
  const restoreDefaults = useCallback(() => write(DEFAULT_WATCHLIST), []);

  return { ids, has, toggle, clear, restoreDefaults, count: ids.length };
}
