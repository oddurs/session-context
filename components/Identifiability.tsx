"use client";

import { ESTIMATES, NAIVE_TOTAL_BITS, SAMPLE_BITS, SOURCES, bitsOf } from "@/lib/entropy";
import { cx } from "./ui";

const STANDING_LABEL = {
  holds: "still holds",
  decayed: "weaker since",
  grown: "stronger since",
} as const;

/**
 * The one number this page refuses to invent.
 *
 * Every site in this genre wants to tell you "1 in 286,777 browsers share your
 * fingerprint". That requires a database of other visitors, which is the thing
 * this page argues against keeping — so instead it shows what researchers
 * measured when they did keep one.
 */
export function Identifiability() {
  const max = Math.max(...ESTIMATES.map(bitsOf));

  return (
    <section id="identifiability" className="mb-major">
      <h2 className="text-xl font-semibold tracking-tight">
        How identifying is any of this?
      </h2>
      <p className="mt-tight mb-body max-w-text text-base">
        A bit of entropy halves the population. Nineteen bits distinguishes one
        person in half a million; thirty-three would distinguish one person on
        earth.
      </p>
      <p className="mt-snug max-w-text text-sm text-ink-muted">
        This page will not tell you that you are “one in 286,777”, because that
        number requires a database of other visitors to compare you against —
        and keeping one would make this page the thing it is arguing about.
        What follows is what researchers measured when they did keep one:
        entropy per signal across {(118934).toLocaleString()} browsers, where
        the most any single signal could contribute was{" "}
        {SAMPLE_BITS.toFixed(1)} bits.
      </p>

      <ul className="mt-body max-w-text">
        {ESTIMATES.map((e) => {
          const bits = bitsOf(e);
          return (
            <li key={e.signal} className="border-t border-rule py-item first:border-t-0">
              <div className="flex items-baseline gap-snug">
                <span className="flex-1 text-sm font-medium">{e.signal}</span>
                <span className="text-xs text-ink-faint">{STANDING_LABEL[e.standing]}</span>
                <span className="w-[4.75rem] shrink-0 whitespace-nowrap text-right font-mono text-sm tabular">
                  {bits.toFixed(1)} bits
                </span>
              </div>
              {/* the page's one piece of visual encoding, and it earns its place */}
              <div className="mt-tight h-px w-full bg-rule">
                <div
                  className={cx("h-px", e.standing === "decayed" ? "bg-ink-faint" : "bg-ink")}
                  style={{ width: `${(bits / max) * 100}%` }}
                />
              </div>
              <p className="mt-tight text-sm text-ink-muted">{e.note}</p>
            </li>
          );
        })}
      </ul>

      <p className="mt-body max-w-text text-sm text-ink-muted">
        Adding these gives {NAIVE_TOTAL_BITS.toFixed(0)} bits, which would
        identify one browser in {Math.round(2 ** NAIVE_TOTAL_BITS / 1e18)}{" "}
        quintillion — an absurd figure, and a useful warning. Entropy is only
        additive when signals are independent, and these are heavily
        correlated: a machine reporting a Retina screen is more likely to
        report Apple fonts and an Apple graphics chip. The real combined figure
        is far lower, and no honest page can compute it without the database
        this one refuses to keep.
      </p>

      <div className="mt-body max-w-text border-t border-rule pt-snug">
        <span className="text-xs text-ink-faint">Sources</span>
        <ul className="mt-tight space-y-hair">
          {SOURCES.map((s) => (
            <li key={s.label} className="text-sm text-ink-muted">
              <a href={s.href} target="_blank" rel="noreferrer" className="text-ink">
                {s.label}
              </a>
              {" — "}
              {s.detail}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
