"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { METHOD_GROUPS } from "@/lib/methods";
import { useScrollSpy } from "@/lib/use-scroll-spy";
import { useAnchorScroll } from "@/lib/use-anchor-scroll";
import { useMediaQuery } from "@/lib/use-client-value";
import { cx } from "./ui";
import { StickyBar } from "./StickyBar";

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
    <StickyBar current="methods" section={current?.title ?? "Methods"}>
      <Link
        href="/"
        className="hidden text-sm text-ink-muted no-underline hover:text-ink hover:underline md:inline"
      >
        See it run on your own browser →
      </Link>
    </StickyBar>
  );
}

export function MethodsContents() {
  const ids = useMemo(() => NAV_ITEMS.map((i) => i.id), []);
  const active = useScrollSpy(ids);
  useAnchorScroll();
  const isWide = useMediaQuery("(min-width: 1024px)", true);
  const toc = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (toc.current) toc.current.open = isWide;
  }, [isWide]);

  return (
    <nav aria-label="Contents" className="mb-group lg:sticky lg:top-14 lg:mb-0 lg:self-start">
      <details ref={toc}>
        <summary className="label flex cursor-pointer list-none items-center justify-between border-b border-rule pb-tight lg:pointer-events-none">
          Contents
          <span className="text-ink-faint lg:hidden">{NAV_ITEMS.length} sections</span>
        </summary>
        <ul className="mt-snug space-y-hair text-sm">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={cx(
                  "flex items-baseline gap-tight border-l py-hair pl-3 no-underline transition-colors hover:text-ink",
                  active === item.id
                    ? "border-ink font-medium text-ink"
                    : "border-transparent text-ink-muted"
                )}
              >
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
