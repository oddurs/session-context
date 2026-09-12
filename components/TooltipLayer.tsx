"use client";

import { useEffect, useRef } from "react";

/** 21rem, matching the panel width the annotation has always had. */
const MAX_WIDTH = 336;
/** The same air a disclosure leaves under its summary. */
const GAP = 7;
/** Never touch the edge of the window. */
const EDGE = 8;

/**
 * One tooltip for the whole document.
 *
 * Every definition used to be a `::after` on its own trigger. Two problems
 * came with that. A hidden pseudo-element still takes part in layout, so a
 * page of forty tables carried some seven hundred invisible panels through
 * every reflow. And each one was positioned inside the table cell it belonged
 * to, so it was subject to whatever that cell's ancestors did — which is why
 * they turned up underneath rules, behind later rows, and clipped at the foot
 * of a section.
 *
 * A single fixed panel, positioned against the viewport, cannot be clipped by
 * an ancestor because it has none that matter. It also gets what a pseudo
 * element could never do: it measures itself, flips above the trigger when
 * there is no room below, and clamps to the window on both axes.
 */
export function TooltipLayer() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tip = ref.current;
    if (!tip) return;
    let anchor: Element | null = null;

    const place = () => {
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const width = Math.min(MAX_WIDTH, window.innerWidth - EDGE * 2);
      tip.style.width = `${width}px`;

      // Height is only knowable once the text is in and the width is set, and
      // a hidden-but-laid-out box measures correctly.
      const height = tip.offsetHeight;
      const below = r.bottom + GAP;
      const above = r.top - GAP - height;
      const flip = below + height > window.innerHeight - EDGE && above > EDGE;

      tip.style.top = `${Math.max(EDGE, flip ? above : below)}px`;
      tip.style.left = `${Math.min(
        Math.max(EDGE, r.left - 8),
        window.innerWidth - width - EDGE
      )}px`;
    };

    const show = (target: Element | null) => {
      const trigger = target?.closest?.("[data-tip]");
      const label = trigger?.getAttribute("data-tip");
      if (!trigger || !label) return;
      anchor = trigger;
      tip.textContent = label;
      place();
      tip.dataset.open = "true";
    };

    const hide = () => {
      anchor = null;
      delete tip.dataset.open;
    };

    const onOver = (e: PointerEvent) => {
      const trigger = (e.target as Element)?.closest?.("[data-tip]");
      if (trigger) show(trigger);
      else if (anchor) hide();
    };
    const onFocus = (e: FocusEvent) => show(e.target as Element);
    const onBlur = () => hide();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    // Following the trigger through a scroll would jitter; the annotation is
    // dismissed instead, which is also what leaving it means.
    const onScroll = () => anchor && hide();

    document.addEventListener("pointerover", onOver);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // The definition already reaches assistive technology through the trigger's
  // own aria-label, so this panel is decoration as far as AT is concerned.
  return <div ref={ref} id="tooltip-layer" aria-hidden="true" />;
}
