"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks the section currently under the top of the viewport, the way
 * documentation sidebars do.
 *
 * Offsets are measured once and cached: reading layout on every scroll frame
 * forces a reflow and makes scrolling stutter.
 */
export function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState("");
  const offsets = useRef<{ id: string; top: number }[]>([]);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      offsets.current = ids
        .map((id) => {
          const el = document.getElementById(id);
          return el ? { id, top: el.getBoundingClientRect().top + window.scrollY } : null;
        })
        .filter((v): v is { id: string; top: number } => v !== null)
        .sort((a, b) => a.top - b.top);
      pick();
    };

    // Pure arithmetic on cached numbers: no layout is read here.
    const pick = () => {
      frame = 0;
      const offset = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue("--nav-offset") || "58",
        10
      );
      const y = window.scrollY + offset + 24;
      let current = offsets.current[0]?.id ?? "";
      for (const entry of offsets.current) {
        if (entry.top <= y) current = entry.id;
        else break;
      }
      setActive((prev) => (prev === current ? prev : current));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(pick);
    };

    measure();
    // Content can still be arriving, so re-measure once things settle.
    const remeasure = setTimeout(measure, 1500);

    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", measure);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", measure);
      clearTimeout(remeasure);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ids]);

  return active;
}
