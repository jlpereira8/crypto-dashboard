import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInDialog } from "../components/layout/SignInDialog";
import { SidebarNav } from "../components/layout/SidebarNav";
import { buildSession, isValidEmail, useSession } from "../lib/useSession";

beforeEach(() => {
  window.localStorage.clear();
});

describe("isValidEmail", () => {
  it("accepts ordinary addresses", () => {
    for (const value of ["a@b.co", "first.last@example.com", "x+tag@sub.domain.io"]) {
      expect(isValidEmail(value)).toBe(true);
    }
  });

  it("rejects anything missing a domain, an @, or containing spaces", () => {
    for (const value of ["", "a", "a@b", "a@b.", "@example.com", "a b@example.com", "a@@b.co"]) {
      expect(isValidEmail(value)).toBe(false);
    }
  });

  it("ignores surrounding whitespace", () => {
    expect(isValidEmail("  someone@example.com  ")).toBe(true);
  });
});

describe("buildSession", () => {
  it("uses the address typed for email sign-in", () => {
    expect(buildSession("email", " me@example.com ")).toMatchObject({
      provider: "email",
      name: "me@example.com",
    });
  });

  it("does not invent a name for Google or Apple", () => {
    // Without a real OAuth exchange the identity is unknown, so a plausible
    // person's name here would be fabricated data.
    for (const provider of ["google", "apple"] as const) {
      const session = buildSession(provider);
      expect(session.name).toBe("Demo user");
      expect(session.detail.toLowerCase()).toContain(provider);
    }
  });
});

/** Exercises the store directly. */
function SessionProbe() {
  const { session, isSignedIn, signIn, signOut } = useSession();
  return (
    <div>
      <span data-testid="state">{isSignedIn ? `in:${session?.name}` : "out"}</span>
      <button type="button" onClick={() => signIn("email", "me@example.com")}>
        sign in email
      </button>
      <button type="button" onClick={() => signIn("google")}>
        sign in google
      </button>
      <button type="button" onClick={signOut}>
        sign out
      </button>
    </div>
  );
}

describe("session store", () => {
  it("starts signed out", () => {
    render(<SessionProbe />);
    expect(screen.getByTestId("state")).toHaveTextContent("out");
  });

  it("signs in, persists, and signs out again", async () => {
    const user = userEvent.setup();
    render(<SessionProbe />);

    await user.click(screen.getByRole("button", { name: /sign in email/i }));
    expect(screen.getByTestId("state")).toHaveTextContent("in:me@example.com");
    expect(window.localStorage.getItem("session")).toContain("me@example.com");

    await user.click(screen.getByRole("button", { name: /sign out/i }));
    expect(screen.getByTestId("state")).toHaveTextContent("out");
    // Signing out removes the key rather than leaving an empty husk behind.
    expect(window.localStorage.getItem("session")).toBeNull();
  });

  it("restores a stored session on mount", () => {
    window.localStorage.setItem(
      "session",
      JSON.stringify({ provider: "apple", name: "Demo user", detail: "Apple · demo session" }),
    );
    render(<SessionProbe />);
    expect(screen.getByTestId("state")).toHaveTextContent("in:Demo user");
  });

  it("treats an unparseable or malformed value as signed out", () => {
    for (const bad of ["{not json", JSON.stringify({ provider: "hackerman" }), JSON.stringify(42)]) {
      window.localStorage.setItem("session", bad);
      const { unmount } = render(<SessionProbe />);
      expect(screen.getByTestId("state")).toHaveTextContent("out");
      unmount();
    }
  });
});

describe("SignInDialog", () => {
  const open = (onClose = () => {}) => render(<SignInDialog open onClose={onClose} />);

  it("offers email, Google and Apple, and never asks for a password", () => {
    open();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with apple/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with email/i })).toBeInTheDocument();
    // No credential is ever collected — there is no backend to check one against.
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });

  it("says the session is local", () => {
    open();
    expect(screen.getByText(/nothing is sent anywhere/i)).toBeInTheDocument();
  });

  it("blocks an invalid email and reports why", async () => {
    const user = userEvent.setup();
    let closed = false;
    open(() => {
      closed = true;
    });

    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /continue with email/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/doesn't look like an email/i);
    expect(closed).toBe(false);
  });

  it("signs in with a valid email and closes", async () => {
    const user = userEvent.setup();
    let closed = false;
    open(() => {
      closed = true;
    });

    await user.type(screen.getByLabelText(/email/i), "someone@example.com");
    await user.click(screen.getByRole("button", { name: /continue with email/i }));

    await waitFor(() => expect(closed).toBe(true), { timeout: 3000 });
    expect(window.localStorage.getItem("session")).toContain("someone@example.com");
  });

  it("signs in through a provider without needing the form", async () => {
    const user = userEvent.setup();
    let closed = false;
    open(() => {
      closed = true;
    });

    await user.click(screen.getByRole("button", { name: /continue with google/i }));
    await waitFor(() => expect(closed).toBe(true), { timeout: 3000 });
    expect(window.localStorage.getItem("session")).toContain("google");
  });
});

describe("sidebar account row", () => {
  it("invites a guest to sign in", async () => {
    const user = userEvent.setup();
    let opened = false;
    render(<SidebarNav pathname="/" onSignIn={() => (opened = true)} />);

    const trigger = screen.getByRole("button", { name: /guest/i });
    expect(trigger).toHaveTextContent(/sign in/i);
    await user.click(trigger);
    expect(opened).toBe(true);
  });

  it("shows the identity and a sign-out control once signed in", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "session",
      JSON.stringify({ provider: "email", name: "me@example.com", detail: "Demo session" }),
    );
    render(<SidebarNav pathname="/" onSignIn={() => {}} />);

    expect(screen.getByText("me@example.com")).toBeInTheDocument();
    expect(screen.queryByText(/^guest$/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() => expect(screen.getByText(/^guest$/i)).toBeInTheDocument());
  });
});
