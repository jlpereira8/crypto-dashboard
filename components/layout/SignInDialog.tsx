import React, { useCallback, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { isValidEmail, useSession, type SessionProvider } from "../../lib/useSession";
import { Button, Field, Input, Modal } from "../ui";
import { BRAND } from "./navigation";

export interface SignInDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Sign-in dialog.
 *
 * Front-end only, and the copy says so — nothing is sent anywhere and the session
 * lives in this browser. Two deliberate omissions follow from that:
 *
 * **No password field.** An app with no backend has nothing to check a password
 * against, so the field would be decoration in the shape of a credential prompt.
 * Email-only (magic-link style) is both the modern pattern and the one that never
 * collects a secret.
 *
 * **No simulated OAuth.** "Continue with Google" is an ordinary button on your own
 * product; a mock Google screen would be something else entirely. These start the
 * local session directly.
 *
 * Focus trap, Escape, scroll lock and focus restoration all come from Modal.
 */
export function SignInDialog({ open, onClose }: SignInDialogProps) {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState<SessionProvider | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const emailError = !email.trim()
    ? "Enter your email address."
    : !isValidEmail(email)
      ? "That doesn't look like an email address."
      : null;

  const finish = useCallback(
    async (provider: SessionProvider, address?: string) => {
      setPending(provider);
      // Stands in for the round trip a real provider would make, so the button's
      // loading state is visible rather than instantaneous.
      await new Promise((resolve) => setTimeout(resolve, 550));
      signIn(provider, address);
      setPending(null);
      setEmail("");
      setTouched(false);
      onClose();
    },
    [onClose, signIn],
  );

  const onSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      setTouched(true);
      if (emailError) {
        emailRef.current?.focus();
        return;
      }
      void finish("email", email);
    },
    [email, emailError, finish],
  );

  const busy = pending !== null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={`Sign in to ${BRAND}`}
      description="This demo has no backend. Signing in only records the choice in this browser — nothing is sent anywhere."
    >
      <div className="space-y-3">
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          disabled={busy}
          loading={pending === "google"}
          onClick={() => void finish("google")}
          leadingIcon={<GoogleMark />}
        >
          Continue with Google
        </Button>

        <Button
          variant="secondary"
          size="lg"
          fullWidth
          disabled={busy}
          loading={pending === "apple"}
          onClick={() => void finish("apple")}
          leadingIcon={<AppleMark />}
        >
          Continue with Apple
        </Button>

        {/* Rule with a centred label, drawn with a border rather than a
            background so it inherits the panel's surface in both themes. */}
        <div className="flex items-center gap-3 py-0.5">
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
          <span className="text-micro uppercase text-ink-muted">or</span>
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
        </div>

        <form noValidate onSubmit={onSubmit} className="space-y-3">
          <Field
            label="Email"
            error={touched ? (emailError ?? undefined) : undefined}
            hint="We'd send a sign-in link here — in this demo, nothing is sent."
          >
            <Input
              ref={emailRef}
              size="lg"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched(true)}
              disabled={busy}
            />
          </Field>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={busy}
            loading={pending === "email"}
          >
            Continue with email
          </Button>
        </form>

        <p className={cn("text-center text-micro leading-relaxed text-ink-muted")}>
          No account is created and no password is ever asked for.
        </p>
      </div>
    </Modal>
  );
}

/**
 * Provider marks.
 *
 * Drawn rather than loaded so the dialog stays self-contained and needs no remote
 * request. Both keep their brand colours: a monochrome Google G is less
 * recognisable than the four-colour one, which is the only reason the mark is
 * there.
 */
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H1.05v2.34A8.99 8.99 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.94H1.05a9 9 0 0 0 0 8.12l2.92-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A8.99 8.99 0 0 0 1.05 4.94l2.92 2.34C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4 text-ink" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.36 9.55c.02 2.16 1.9 2.88 1.92 2.89-.02.05-.3 1.03-1 2.04-.6.87-1.23 1.73-2.22 1.75-.97.02-1.28-.57-2.4-.57-1.11 0-1.45.56-2.37.59-.95.03-1.67-.93-2.28-1.79C2.76 12.7 1.79 9.42 3.1 7.4c.65-1 1.8-1.64 3.05-1.66.94-.02 1.83.63 2.4.63.58 0 1.66-.78 2.79-.66.48.02 1.82.17 2.7 1.31-.7.05-1.68.98-1.67 2.53zM10.6 4.24c.5-.6.84-1.44.75-2.28-.74.03-1.63.49-2.15 1.1-.47.53-.87 1.39-.76 2.2.82.07 1.66-.42 2.16-1.02z"
      />
    </svg>
  );
}
