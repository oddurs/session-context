"use client";

import { useState } from "react";
import type { Finding } from "@/lib/findings";
import { ICON_FOR_GROUP } from "@/lib/taxonomy";
import { Icon } from "./Icon";
import { Json, looksLikeJson } from "./Json";
import { RuleHeading, cx } from "./ui";

function Value({ value }: { value: unknown }) {
  if (value === undefined || value === null || value === "")
    return <span className="italic text-ink-faint">not reported</span>;
  if (typeof value === "boolean") return <>{value ? "yes" : "no"}</>;
  if (looksLikeJson(value))
    return <Json value={typeof value === "string" ? JSON.parse(value) : value} dense />;
  return <>{String(value)}</>;
}

/**
 * One finding: a statement, an explanation, and a line saying how it was
 * obtained and what from.
 *
 * The evidence opens *below* that line rather than inside it — as part of the
 * row it stretched the row's height and left the other items floating against
 * its middle.
 */
export function FindingArticle({
  finding,
  compact,
}: {
  finding: Finding;
  /**
   * Drop the headline and the rule above it. Used where the surrounding
   * context has already stated the fact — the permission ledger prints the
   * value in its own contrast panel, and the headline underneath was saying
   * the same number a second time, under a rule that made two blocks out of
   * one thought.
   */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const count = finding.evidence.length;

  return (
    <article
      className={
        compact ? "" : "border-t border-rule py-item first:border-t-0 first:pt-0"
      }
    >
      {!compact && (
        <h4 className="max-w-lede text-lg font-medium tracking-tight">
          {finding.headline}
        </h4>
      )}
      <p className={cx("max-w-text text-sm text-ink-muted", !compact && "mt-tight")}>
        {finding.detail}
      </p>

      <div className="mt-snug flex flex-wrap items-baseline gap-x-tight gap-y-hair text-sm">
        <span className="text-ink-faint">{finding.how}</span>
        <span aria-hidden className="text-rule-strong">
          ·
        </span>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-baseline gap-hair text-ink-muted hover:text-ink hover:underline"
        >
          <svg
            viewBox="0 0 16 16"
            className={cx(
              "size-3 translate-y-px text-ink-faint transition-transform",
              open && "rotate-90"
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 4l4 4-4 4" />
          </svg>
          {open ? "hide the values" : `${count} value${count === 1 ? "" : "s"} behind this`}
        </button>
      </div>

      {open && (
        <div className="mt-snug max-w-text border-l border-rule pl-4 motion-safe:animate-[rise-in_160ms_ease-out]">
          <dl className="grid gap-x-group gap-y-hair sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
            {finding.evidence.map((e, i) => (
              <div key={i} className="contents">
                <dt className="font-mono text-sm break-words text-ink-muted">{e.k}</dt>
                <dd className="font-mono text-sm break-words [overflow-wrap:anywhere]">
                  <Value value={e.v} />
                </dd>
              </div>
            ))}
          </dl>
          <a
            href={`#${finding.sectionId}`}
            className="mt-snug inline-block text-sm text-ink-muted no-underline hover:text-ink hover:underline"
          >
            Everything in this table →
          </a>
        </div>
      )}
    </article>
  );
}

/**
 * Findings read as a document: one column, hairline separators, hierarchy from
 * type rather than boxes.
 */
export function Findings({
  findings,
  groups,
  stagger,
}: {
  findings: Finding[];
  groups: string[];
  /** let the groups resolve in sequence rather than all at once */
  stagger?: boolean;
}) {
  if (!findings.length) return null;
  const present = groups.filter((g) => findings.some((f) => f.group === g));

  return (
    <div>
      {present.map((g, index) => (
        <section
          key={g}
          className="mt-section first:mt-0 motion-safe:animate-[rise-in_260ms_ease-out] motion-safe:[animation-fill-mode:backwards]"
          style={stagger ? { animationDelay: `${index * 55}ms` } : undefined}
        >
          <RuleHeading as="h3" className="mb-body">
            <Icon name={ICON_FOR_GROUP[g] ?? "info"} className="size-4 text-ink-faint" />
            {g}
          </RuleHeading>
          <div>
            {findings
              .filter((f) => f.group === g)
              .map((f) => (
                <FindingArticle key={f.id} finding={f} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
