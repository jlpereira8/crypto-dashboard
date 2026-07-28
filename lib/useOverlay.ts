import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

/**
 * Traps Tab inside `container` while `active`, and restores focus to whatever
 * was focused before on close.
 *
 * The previous drawer implementation recomputed its focus list on every keypress
 * and indexed into it with `indexOf(document.activeElement)`, which silently
 * did nothing whenever focus sat on the panel itself (index -1). This version
 * only intercepts Tab at the two real edges and lets the browser handle the
 * middle of the list, which is both cheaper and correct.
 */
export function useFocusTrap(active: boolean, container: React.RefObject<HTMLElement | null>) {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const node = container.current;
    if (!node) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Focus the first control, or the panel itself if it holds none yet.
    const initial = getFocusable(node)[0];
    if (initial) {
      initial.focus();
    } else {
      node.focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = getFocusable(node);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (current === first || current === node)) {
        event.preventDefault();
        last.focus();
      }
    };

    node.addEventListener("keydown", onKeyDown);
    return () => {
      node.removeEventListener("keydown", onKeyDown);
      // Guard against restoring focus to a node that has since been removed.
      const target = previouslyFocused.current;
      if (target && document.contains(target)) target.focus();
    };
  }, [active, container]);
}

/**
 * Prevents the page behind an overlay from scrolling, compensating for the
 * scrollbar's width so the layout underneath doesn't shift sideways.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [active]);
}

/** Calls `onEscape` on Escape while `active`. */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onEscape();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, onEscape]);
}

/** Calls `onOutside` on pointer-down outside every provided ref. */
export function useClickOutside(
  active: boolean,
  refs: React.RefObject<HTMLElement | null>[],
  onOutside: () => void,
) {
  // Refs array is often built inline; keep the latest without re-subscribing.
  const latest = useRef({ refs, onOutside });
  latest.current = { refs, onOutside };

  useEffect(() => {
    if (!active) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const inside = latest.current.refs.some((ref) => ref.current?.contains(target));
      if (!inside) latest.current.onOutside();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [active]);
}
