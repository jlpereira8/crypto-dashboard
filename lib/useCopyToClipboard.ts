import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Copy-to-clipboard with a self-clearing "copied" flag.
 *
 * Falls back to a hidden textarea + `execCommand` because the async Clipboard API
 * is unavailable on insecure origins, which includes the LAN addresses this app
 * gets served on during development.
 */
export function useCopyToClipboard(resetAfterMs = 1800) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string) => {
      const flag = () => {
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), resetAfterMs);
      };

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          flag();
          return true;
        }
      } catch {
        // Fall through to the legacy path below.
      }

      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(area);
        if (ok) flag();
        return ok;
      } catch {
        return false;
      }
    },
    [resetAfterMs],
  );

  return { copied, copy };
}
