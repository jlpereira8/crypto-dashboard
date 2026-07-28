import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/cn";
import { transition, withReducedMotion } from "../../lib/motion";
import { CloseButton } from "../ui";

export interface StatusMessage {
  tone: "success" | "error";
  title: string;
  detail?: string;
}

/**
 * Inline result feedback for a form.
 *
 * Success uses `role="status"` (polite) and failure uses `role="alert"`
 * (assertive) — a completed action shouldn't interrupt what the user is reading,
 * but a failure should. Both carry a glyph and a text label, so the tone is
 * never communicated by colour alone.
 */
export function StatusBanner({
  message,
  onDismiss,
}: {
  message: StatusMessage | null;
  onDismiss: () => void;
}) {
  const reduced = useReducedMotion() ?? false;

  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          role={message.tone === "error" ? "alert" : "status"}
          initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
          animate={
            reduced ? { opacity: 1 } : { opacity: 1, height: "auto", marginTop: "0.75rem" }
          }
          exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
          transition={withReducedMotion(transition.base, reduced)}
          className="overflow-hidden"
        >
          <div
            className={cn(
              "flex items-start gap-2 rounded-xl p-3 ring-1 ring-inset",
              message.tone === "success"
                ? "bg-positive-soft text-positive ring-positive-line"
                : "bg-negative-soft text-negative ring-negative-line",
            )}
          >
            <span aria-hidden="true" className="mt-px shrink-0">
              {message.tone === "success" ? <CheckIcon /> : <WarnIcon />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">{message.title}</p>
              {message.detail && <p className="mt-0.5 text-xs opacity-90">{message.detail}</p>}
            </div>
            <CloseButton onClick={onDismiss} label="Dismiss message" className="-mt-0.5 h-6 w-6" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m5.25 8.25 1.75 1.75 3.75-3.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11" r="0.75" fill="currentColor" />
    </svg>
  );
}
