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

    /**
     * A link followed *into* this page names a section that does not exist
     * yet: the data page collects before it renders anything. So wait for the
     * target to appear, and keep aligning while the page settles around it.
     */
    const waitForTarget = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!id) return;

      const deadline = Date.now() + 20_000;
      const poll = () => {
        if (cancelled) return;
        const el = document.getElementById(id);
        // Present is not enough: until the page reveals its sections the
        // target is display:none, and measuring it returns zero — which is
        // how a cross-page link ended up scrolling to the top of the page.
        const laidOut = el ? el.getBoundingClientRect().height > 0 : false;
        if (laidOut) {
          align(id);
          // Sections keep arriving for a moment after the first one lands.
          setTimeout(() => !cancelled && align(id), 1200);
          return;
        }
        if (Date.now() < deadline) setTimeout(poll, 100);
      };
      poll();
    };

    document.addEventListener("click", onClick);
    addEventListener("hashchange", onHashChange);
    waitForTarget();

    return () => {
      cancelled = true;
      document.removeEventListener("click", onClick);
      removeEventListener("hashchange", onHashChange);
    };
  }, []);
}
