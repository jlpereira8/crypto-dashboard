import React, { useId, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/cn";
import { overlay, spring, transition, withReducedMotion } from "../../lib/motion";
import { useEscapeKey, useFocusTrap, useScrollLock } from "../../lib/useOverlay";
import { CloseButton } from "./Modal";
import { Portal } from "./Portal";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "left" | "right";
  /** Drop the body padding, for children that manage their own (e.g. a nav). */
  flush?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Edge-anchored panel, sharing the dialog semantics and focus handling used by
 * Modal. Slides in on a spring — a duration tween reads as mechanical for
 * something this large.
 */
export function Drawer({
  open,
  onClose,
  title,
  side = "left",
  flush = false,
  children,
  footer,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = `${useId()}-title`;
  const reduced = useReducedMotion() ?? false;

  useScrollLock(open);
  useEscapeKey(open, onClose);
  useFocusTrap(open, panelRef);

  const offset = side === "left" ? "-100%" : "100%";

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[100]">
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              variants={overlay}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={withReducedMotion(transition.fast, reduced)}
              onClick={onClose}
              aria-hidden="true"
            />

            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              className={cn(
                "absolute inset-y-0 flex w-[min(20rem,85vw)] flex-col bg-surface shadow-modal outline-none",
                side === "left" ? "left-0 ring-1 ring-line" : "right-0 ring-1 ring-line",
              )}
              initial={{ x: offset }}
              animate={{ x: 0 }}
              exit={{ x: offset }}
              transition={withReducedMotion(spring.panel, reduced)}
            >
              <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 pwa-safe-padding-top">
                <h2 id={titleId} className="text-sm font-semibold text-ink">
                  {title}
                </h2>
                <CloseButton onClick={onClose} label="Close menu" />
              </div>

              <div
                className={cn(
                  "scrollbar-slim flex-1 overflow-y-auto overscroll-contain",
                  !flush && "p-4",
                )}
              >
                {children}
              </div>

              {footer && <div className="border-t border-line p-4">{footer}</div>}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
