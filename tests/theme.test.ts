import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_THEME, THEME_INIT_SCRIPT, resolveInitialTheme } from "../lib/useTheme";

describe("theme resolution", () => {
  it("defaults to dark for a first-time visitor", () => {
    expect(DEFAULT_THEME).toBe("dark");
    expect(resolveInitialTheme(null)).toBe("dark");
  });

  it("honours a stored preference in either direction", () => {
    expect(resolveInitialTheme("light")).toBe("light");
    expect(resolveInitialTheme("dark")).toBe("dark");
  });

  it("falls back to dark for a junk stored value", () => {
    for (const value of ["", "Dark", "system", "true", "{}"]) {
      expect(resolveInitialTheme(value)).toBe("dark");
    }
  });

  it("does not consult prefers-color-scheme", () => {
    // The OS preference is deliberately not part of the rule; if it ever crept
    // back into the blocking script, dark would stop being the default.
    expect(THEME_INIT_SCRIPT).not.toContain("prefers-color-scheme");
    expect(THEME_INIT_SCRIPT).not.toContain("matchMedia");
  });
});

/**
 * The blocking script duplicates `resolveInitialTheme` because it has to run
 * before React does. These run the real string against jsdom's real document, so
 * the duplication can't drift and the DOM calls inside it are genuinely exercised.
 */
describe("blocking theme script", () => {
  function execute(storage: { getItem: (key: string) => string | null }) {
    const body = THEME_INIT_SCRIPT.replace(/^\(function\(\)\{/, "").replace(/\}\)\(\);$/, "");
    new Function("localStorage", body)(storage);
  }

  function run(stored: string | null) {
    execute({ getItem: () => stored });
    return {
      theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
      chrome: document.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
    };
  }

  function reset() {
    document.documentElement.className = "";
    document.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
  }

  beforeEach(reset);

  it("agrees with resolveInitialTheme for every input", () => {
    for (const stored of [null, "dark", "light", "garbage", ""]) {
      reset();
      expect(run(stored).theme).toBe(resolveInitialTheme(stored));
    }
  });

  it("creates the theme-color meta rather than assuming one exists", () => {
    // Regression: the script runs while <head> is still parsing, so a meta
    // declared in next/head is not reliably present yet. Updating in place
    // silently did nothing and the browser chrome kept the stale colour.
    expect(document.querySelector('meta[name="theme-color"]')).toBeNull();
    expect(run(null).chrome).toBe("#08090b");
    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);
  });

  it("sets the chrome colour to match the resolved theme", () => {
    expect(run("light").chrome).toBe("#f7f7f8");
    reset();
    expect(run("dark").chrome).toBe("#08090b");
  });

  it("does not stack duplicate metas across repeated runs", () => {
    run(null);
    run("light");
    run("dark");
    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);
  });

  it("still lands on dark if storage is blocked", () => {
    execute({
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
