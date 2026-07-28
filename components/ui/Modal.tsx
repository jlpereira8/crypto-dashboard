import React, { useId, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/cn";
import { modalPanel, overlay, transition, withReducedMotion } from "../../lib/motion";
import { useEscapeKey, useFocusTrap, useScrollLock } from "../../lib/useOverlay";
import { Portal } from "./Portal";

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
} as const;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: keyof typeof SIZES;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Accessible dialog: focus trap, Escape to dismiss, backdrop click to dismiss,
 * page scroll locked, and `aria-labelledby`/`aria-describedby` wired to the real
 * heading and description nodes.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  footer,
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;
  const reduced = useReducedMotion() ?? false;

  useScrollLock(open);
  useEscapeKey(open, onClose);
  useFocusTrap(open, panelRef);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
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
              aria-describedby={description ? descriptionId : undefined}
              tabIndex={-1}
              className={cn(
                "relative w-full rounded-2xl bg-surface shadow-modal ring-1 ring-line outline-none",
                SIZES[size],
              )}
              variants={modalPanel}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={withReducedMotion(transition.slow, reduced)}
            >
              <div className="flex items-start justify-between gap-4 p-4 pb-0">
                <div className="space-y-1">
                  <h2 id={titleId} className="text-sm font-semibold tracking-tight text-ink">
                    {title}
                  </h2>
                  {description && (
                    <p id={descriptionId} className="text-xs text-ink-muted">
                      {description}
                    </p>
                  )}
                </div>
                <CloseButton onClick={onClose} label="Close dialog" />
              </div>

              {children && <div className="p-4">{children}</div>}

              {footer && (
                <div className="flex items-center justify-end gap-2 border-t border-line p-3">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export function CloseButton({
  onClick,
  label,
  className,
}: {
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "focus-ring -m-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
        "text-ink-muted transition-colors duration-fast hover:bg-surface-subtle hover:text-ink",
        className,
      )}
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
        <path
          d="m4 4 8 8M12 4l-8 8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
