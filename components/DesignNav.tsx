"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { useScrollSpy } from "@/lib/use-scroll-spy";
import { useAnchorScroll } from "@/lib/use-anchor-scroll";
import { useMediaQuery } from "@/lib/use-client-value";
import { cx } from "./ui";
import { StickyBar } from "./StickyBar";

export const DESIGN_SECTIONS = [
  { id: "principles", title: "Principles" },
  { id: "color", title: "Ink and paper" },
  { id: "type", title: "Type" },
  { id: "rules", title: "Rules and spacing" },
  { id: "primitives", title: "Primitives" },
  { id: "tables", title: "Tables" },
  { id: "motion", title: "Motion" },
  { id: "icons", title: "Icons" },
  { id: "voice", title: "Voice" },
];

export function DesignBar() {
  const ids = useMemo(() => DESIGN_SECTIONS.map((s) => s.id), []);
  const active = useScrollSpy(ids);
  const current = DESIGN_SECTIONS.find((s) => s.id === active);

  return (
    <StickyBar current="none" section={current?.title ?? "Design notes"}>
      <Link
        href="/"
        className="hidden text-sm text-ink-muted no-underline hover:text-ink hover:underline md:inline"
      >
        See the system in use →
      </Link>
    </StickyBar>
  );
}

export function DesignContents() {
  const ids = useMemo(() => DESIGN_SECTIONS.map((s) => s.id), []);
  const active = useScrollSpy(ids);
  useAnchorScroll();
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
          <span className="text-ink-faint lg:hidden">{DESIGN_SECTIONS.length} sections</span>
        </summary>
        <ul className="mt-2 space-y-1 text-sm">
          {DESIGN_SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={cx(
                  "block border-l py-0.5 pl-3 no-underline transition-colors hover:text-ink",
                  active === s.id
                    ? "border-ink font-medium text-ink"
                    : "border-transparent text-ink-muted"
                )}
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </nav>
  );
}
