import { useLayoutEffect, useRef, useState } from "react";

/**
 * Measures a container's width so an SVG chart can lay out in real pixels.
 *
 * Scaling a fixed viewBox with `preserveAspectRatio` would be simpler but
 * distorts stroke widths and text non-uniformly, so the chart is drawn at the
 * true measured size instead.
 */
export function useChartWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Measure synchronously first so the chart can paint on the initial commit.
    setWidth(node.clientWidth);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      // `contentRect` excludes padding, which is what the plot area wants.
      const next = Math.round(entry.contentRect.width);
      // Ignore sub-pixel churn: re-deriving scales for a 0.5px change is waste.
      setWidth((current) => (Math.abs(current - next) >= 1 ? next : current));
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
