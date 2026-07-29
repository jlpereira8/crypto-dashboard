import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/router";
import { cn } from "../../lib/cn";
import { transition, withReducedMotion } from "../../lib/motion";
import { Button, Drawer } from "../ui";
import { SidebarNav } from "./SidebarNav";
import { sectionTitle } from "./navigation";

/**
 * Fetched the first time someone reaches for it. It pulls in a form, a modal and
 * two provider marks that most visits never need.
 */
const SignInDialog = dynamic(() => import("./SignInDialog").then((m) => m.SignInDialog), {
  ssr: false,
});

export interface AppShellProps {
  /** Changes per route, driving the content transition. */
  routeKey: string;
  children: React.ReactNode;
}

/**
 * The application shell.
 *
 * This replaces v1's horizontal navbar over a centred max-width column. That
 * arrangement is what made the product read as a website: navigation consumed a
 * full-width band, and content was capped in the middle of the screen with
 * gutters on both sides.
 *
 * Here the shell is a **sticky left rail plus a full-bleed workspace**. The rail
 * stays pinned while the document scrolls normally — deliberately not an
 * `overflow: hidden` app frame with an inner scroller, which breaks mobile
 * address-bar collapse and the iOS safe-area handling for no visual gain.
 *
 * Content is edge-to-edge. Regions inside it are separated by hairlines rather
 * than floated as cards, so the page reads as one instrument instead of a stack
 * of tiles.
 */
export function AppShell({ routeKey, children }: AppShellProps) {
  const router = useRouter();
  const pathname = router?.pathname ?? "/";
  const reduced = useReducedMotion() ?? false;

  const [drawerOpen, setDrawerOpen] = useState(false);
  // Latched so the drawer's chunk is only fetched once it's actually wanted,
  // while still allowing its exit animation to play afterwards.
  const [drawerMounted, setDrawerMounted] = useState(false);

  const [signInOpen, setSignInOpen] = useState(false);
  const [signInMounted, setSignInMounted] = useState(false);

  const openDrawer = useCallback(() => {
    setDrawerMounted(true);
    setDrawerOpen(true);
  }, []);

  const openSignIn = useCallback(() => {
    setSignInMounted(true);
    setSignInOpen(true);
    // The drawer is a modal too; two at once would fight over the focus trap.
    setDrawerOpen(false);
  }, []);

  useEffect(() => {
    if (!router?.events) return;
    const close = () => setDrawerOpen(false);
    router.events.on("routeChangeComplete", close);
    return () => router.events.off("routeChangeComplete", close);
  }, [router?.events]);

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      <div className="ios-top-blur-overlay" />

      {/* First tab stop, visible only on focus. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[120] focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-xs focus:font-medium focus:text-accent-ink"
      >
        Skip to main content
      </a>

      {/* ── Sidebar (lg+) ───────────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden w-sidebar shrink-0 border-r border-line bg-canvas",
          "lg:sticky lg:top-0 lg:block lg:h-screen",
        )}
      >
        <SidebarNav pathname={pathname} onSignIn={openSignIn} />
      </aside>

      {/* ── Workspace ───────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col bg-surface">
        {/* Top bar: context and account actions, not navigation. */}
        <header
          className={cn(
            "sticky-safe z-40 flex h-12 shrink-0 items-center gap-2 border-b border-line px-3 sm:px-4",
            "bg-surface-veil backdrop-blur-xl backdrop-saturate-150",
          )}
        >
          <Button
            variant="ghost"
            iconOnly
            size="sm"
            className="lg:hidden"
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            onClick={openDrawer}
          >
            <MenuIcon />
          </Button>

          <h1 className="truncate text-xs font-semibold tracking-tight text-ink">
            {sectionTitle(pathname)}
          </h1>

          <span
            aria-hidden="true"
            className="ml-auto hidden items-center gap-1.5 text-micro uppercase text-ink-muted sm:flex"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-positive" />
            Live
          </span>
        </header>

        <main id="main" className="min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={routeKey}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={withReducedMotion(transition.base, reduced)}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {signInMounted && (
        <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />
      )}

      {drawerMounted && (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Menu" flush>
          <SidebarNav
            pathname={pathname}
            showBrand={false}
            onNavigate={() => setDrawerOpen(false)}
            onSignIn={openSignIn}
          />
        </Drawer>
      )}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M2 4h12M2 8h12M2 12h12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
