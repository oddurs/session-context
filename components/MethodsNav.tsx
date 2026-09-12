"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { METHOD_GROUPS } from "@/lib/methods";
import { useScrollSpy } from "@/lib/use-scroll-spy";
import { useMediaQuery } from "@/lib/use-client-value";
import { Icon } from "./Icon";
import { cx } from "./ui";

const NAV_ITEMS = [
  ...METHOD_GROUPS.map((g) => ({ id: g.id, title: g.title, icon: g.icon, count: g.methods.length })),
  { id: "declined", title: "Deliberately not built", icon: "shield" as const, count: 5 },
];

/** Sticky bar naming where you are, mirroring the data page. */
export function MethodsBar() {
  const ids = useMemo(() => NAV_ITEMS.map((i) => i.id), []);
  const active = useScrollSpy(ids);
  const current = NAV_ITEMS.find((i) => i.id === active);

  return (
    <div className="sticky top-0 z-40 -mx-4 mb-10 border-b border-rule bg-paper px-4 py-2 sm:-mx-6 sm:px-6">
      <div className="mx-auto flex max-w-page items-center gap-4">
        <button
          type="button"
          title="Back to the top"
          onClick={() => scrollTo({ top: 0 })}
          className="truncate text-left text-sm text-ink-muted hover:text-ink"
        >
          {current?.title ?? "Methods"}
        </button>
        <Link
          href="/"
          className="ml-auto shrink-0 text-sm text-ink-muted no-underline hover:text-ink hover:underline"
        >
          See it run on your own browser →
        </Link>
      </div>
    </div>
  );
}

/** Contents rail: beside the text on wide screens, collapsed above it below. */
export function MethodsContents() {
  const ids = useMemo(() => NAV_ITEMS.map((i) => i.id), []);
  const active = useScrollSpy(ids);
  const isWide = useMediaQuery("(min-width: 1024px)", true);
  const toc = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (toc.current) toc.current.open = isWide;
  }, [isWide]);

  return (
    <nav aria-label="Contents" className="mb-10 lg:sticky lg:top-14 lg:mb-0 lg:self-start">
      <details ref={toc}>
        <summary className="label flex cursor-pointer list-none items-center justify-between border-b border-rule pb-1.5 lg:pointer-events-none">
          Contents
          <span className="text-ink-faint lg:hidden">{NAV_ITEMS.length} sections</span>
        </summary>
        <ul className="mt-2 space-y-1 text-sm">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={cx(
                  "flex items-baseline gap-2 border-l py-0.5 pl-3 no-underline transition-colors hover:text-ink",
                  active === item.id
                    ? "border-ink font-medium text-ink"
                    : "border-transparent text-ink-muted"
                )}
              >
                <Icon name={item.icon} className="size-3.5 shrink-0 translate-y-0.5 text-ink-faint" />
                <span className="flex-1">{item.title}</span>
                <span className="text-xs text-ink-faint tabular">{item.count}</span>
              </a>
            </li>
          ))}
        </ul>
      </details>
    </nav>
  );
}
