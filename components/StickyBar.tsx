"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { Logo } from "./Logo";
import { cx } from "./ui";

const PAGES = [
  { href: "/", label: "Findings & data" },
  { href: "/methods", label: "Methods" },
] as const;

/**
 * The bar that replaces the masthead once it scrolls away.
 *
 * At the top of the page it is a thin contextual strip and nothing more: the
 * masthead is right there, carrying identity and navigation. Past the
 * masthead — which is nearly all of a page this long — it takes over both,
 * because otherwise the only route to another page is a scroll back to the
 * top.
 */
export function StickyBar({
  section,
  current,
  children,
}: {
  /** where the reader currently is */
  section: ReactNode;
  current: "data" | "methods" | "none";
  /** page-specific actions, shown after the page links */
  children?: ReactNode;
}) {
  const [detached, setDetached] = useState(false);

  useEffect(() => {
    const masthead = document.querySelector("header");
    if (!masthead) return;
    const observer = new IntersectionObserver(
      ([entry]) => setDetached(!entry.isIntersecting),
      { rootMargin: "-48px 0px 0px 0px" }
    );
    observer.observe(masthead);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="sticky top-0 z-40 -mx-4 mb-10 border-b border-rule bg-paper px-4 sm:-mx-6 sm:px-6">
      <div className="mx-auto flex h-[46px] max-w-page items-center gap-4">
        {/* The wordmark returns, and carries the way home. */}
        <Link
          href="/"
          title="Session Context — back to the top"
          onClick={(e) => {
            if (location.pathname === "/") {
              e.preventDefault();
              scrollTo({ top: 0 });
            }
          }}
          className={cx(
            // Collapses to nothing at rest so the section label keeps the left
            // margin, then widens as the masthead leaves.
            "flex shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap no-underline",
            "transition-[max-width,opacity] duration-300 ease-out",
            detached ? "max-w-[16rem] opacity-100" : "pointer-events-none max-w-0 opacity-0"
          )}
        >
          <Logo className="h-4 w-auto" />
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">
            Session Context
          </span>
        </Link>

        <span
          className={cx(
            "truncate text-sm text-ink-muted transition-[padding] duration-300 ease-out",
            detached && "border-l border-rule pl-4"
          )}
        >
          {section}
        </span>

        <nav
          className={cx(
            "ml-auto flex shrink-0 items-center gap-4 overflow-hidden whitespace-nowrap",
            "transition-[max-width,opacity] duration-300 ease-out",
            detached ? "max-w-[16rem] opacity-100" : "pointer-events-none max-w-0 opacity-0"
          )}
        >
          {PAGES.filter((p) => !(current === "data" && p.href === "/")).map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className={cx(
                "hidden text-sm no-underline hover:text-ink hover:underline sm:inline",
                (current === "methods" && p.href === "/methods") ? "text-ink" : "text-ink-muted"
              )}
            >
              {p.label}
            </Link>
          ))}
        </nav>

        {children && (
          <div className={cx("flex shrink-0 items-center gap-1", !detached && "ml-auto")}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
