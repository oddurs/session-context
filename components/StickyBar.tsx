"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { Icon } from "./Icon";
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
        {/*
          * The wordmark is the way back to the top of whatever you are
          * reading — which is where the masthead, and therefore the page
          * navigation, lives. Moving between pages is the job of the links on
          * the right, so this never has to guess which you meant.
          */}
        <button
          type="button"
          title="Back to the top"
          aria-label="Back to the top"
          // A jump, not a glide: this document runs to tens of thousands of
          // pixels, where smooth scrolling stops being a courtesy.
          onClick={() => scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })}
          className={cx(
            "group/top",
            // Collapses to nothing at rest so the section label keeps the left
            // margin, then widens as the masthead leaves.
            "flex shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap no-underline",
            "transition-[max-width,opacity] duration-300 ease-out",
            detached ? "max-w-[16rem] opacity-100" : "pointer-events-none max-w-0 opacity-0"
          )}
        >
          <span className="relative grid size-4 place-items-center">
            <Logo className="h-4 w-auto transition-opacity group-hover/top:opacity-0" />
            <Icon
              name="up"
              className="absolute size-4 opacity-0 transition-opacity group-hover/top:opacity-100"
            />
          </span>
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">
            Session Context
          </span>
        </button>

        <span
          className={cx(
            "truncate text-sm text-ink-muted transition-[padding] duration-300 ease-out",
            detached && "border-l border-rule pl-4"
          )}
        >
          {section}
        </span>

        {/*
          * Two registers, kept apart: plain words take you somewhere, words
          * with a glyph do something here. A hairline between them stops the
          * five items reading as one undifferentiated list.
          */}
        <nav
          aria-label="Pages"
          className={cx(
            "ml-auto flex shrink-0 items-center gap-5 overflow-hidden whitespace-nowrap",
            "transition-[max-width,opacity] duration-300 ease-out",
            detached ? "max-w-[18rem] opacity-100" : "pointer-events-none max-w-0 opacity-0"
          )}
        >
          {PAGES.map((p) => {
            const here =
              (current === "data" && p.href === "/") ||
              (current === "methods" && p.href === "/methods");
            return (
              <Link
                key={p.href}
                href={p.href}
                aria-current={here ? "page" : undefined}
                className={cx(
                  "hidden text-sm no-underline sm:inline",
                  here
                    ? "font-medium text-ink"
                    : "text-ink-muted hover:text-ink hover:underline"
                )}
              >
                {p.label}
              </Link>
            );
          })}
        </nav>

        {children && (
          <div
            className={cx(
              "flex shrink-0 items-center gap-0.5",
              !detached && "ml-auto",
              detached && "ml-5 border-l border-rule pl-5"
            )}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
