"use client";

import { useEffect } from "react";

/**
 * Make in-page links land where they should.
 *
 * Sections below the fold are rendered lazily, so the browser scrolls using an
 * estimated height and then corrects itself once the real content lays out —
 * which leaves the target well away from where it was asked to be. After any
 * hash navigation this re-aligns the target for a few frames, until its
 * position stops moving.
 */
export function useAnchorScroll() {
  useEffect(() => {
    let cancelled = false;

    const align = (id: string) => {
      const offset = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue("--nav-offset") || "58",
        10
      );

      let previous = Number.NaN;
      let attempts = 0;

      const step = () => {
        if (cancelled) return;
        const el = document.getElementById(id);
        if (!el) return;

        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        // Stop as soon as the target holds still between frames.
        if (Math.abs(top - previous) < 1 && attempts > 1) return;

        window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
        previous = top;
        attempts += 1;
        if (attempts < 12) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey) return;
      const link = (event.target as HTMLElement)?.closest?.("a");
      const href = link?.getAttribute("href");
      if (!href?.startsWith("#") || href.length < 2) return;

      const id = decodeURIComponent(href.slice(1));
      if (!document.getElementById(id)) return;

      event.preventDefault();
      history.pushState(null, "", href);
      align(id);
    };

    const onHashChange = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (id) align(id);
    };

    document.addEventListener("click", onClick);
    addEventListener("hashchange", onHashChange);
    // A link followed into the page should land correctly too.
    if (location.hash) setTimeout(onHashChange, 300);

    return () => {
      cancelled = true;
      document.removeEventListener("click", onClick);
      removeEventListener("hashchange", onHashChange);
    };
  }, []);
}
