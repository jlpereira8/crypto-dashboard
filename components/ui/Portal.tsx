import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children into `document.body`, so overlays escape any ancestor's
 * `overflow`, `transform` or stacking context. Returns null until mounted, which
 * keeps server and client markup identical.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}
