"use client";

import { memo, useState } from "react";
import type { Row, Section } from "@/lib/types";
import { useFieldNotes } from "@/lib/notes";
import { LIVE_SECTIONS } from "@/lib/live";
import { Json, looksLikeJson } from "./Json";
import { MoreToggle, Table, Td, Th, Tooltip, cx } from "./ui";

const LONG = 260;

/** A value the browser refused, withheld, or has no support for. */
export function isUnreported(v: unknown): boolean {
  if (v === undefined || v === null || v === "") return true;
  const s = String(v);
  return (
    s === "unsupported" || s === "not queryable" || s === "absent" ||
    s === "none" || s === "unknown" || s === "not set" ||
    s === "no event received" || s === "unmeasurable" || s === "timed out" ||
    s.startsWith("error:")
  );
}

const NUMERIC = /^[\d.,:+\-\s]+(ms|s|px|%|GiB|MiB|KB|MB|Hz|dppx|Mb\/s)?$/;

function Value({ v }: { v: unknown }) {
  const [open, setOpen] = useState(false);

  if (v === undefined) return <span className="italic text-ink-faint">not reported</span>;
  if (v === null) return <span className="italic text-ink-faint">null — not reported</span>;
  if (v === "") return <span className="italic text-ink-faint">empty</span>;
  if (typeof v === "boolean")
    return <span className={v ? "text-ink" : "text-ink-muted"}>{v ? "yes" : "no"}</span>;

  // Structured values keep their shape instead of being wrapped into nonsense.
  if (looksLikeJson(v)) return <Json value={typeof v === "string" ? JSON.parse(v) : v} dense />;

  const text = String(v);
  if (isUnreported(text)) return <span className="italic text-ink-faint">{text}</span>;

  if (text.length > LONG) {
    return (
      <>
        <span className="[overflow-wrap:anywhere]">
          {open ? text : `${text.slice(0, LONG)}…`}
        </span>{" "}
        <MoreToggle
          open={open}
          onToggle={() => setOpen(!open)}
          more={`show all ${text.length.toLocaleString()}`}
          less="show less"
        />
      </>
    );
  }
  return (
    <span className={cx("[overflow-wrap:anywhere]", NUMERIC.test(text) && "tabular")}>{text}</span>
  );
}

function Term({
  field,
  sectionId,
  reveal,
  children,
}: {
  field: string;
  sectionId?: string;
  /** Print the definition rather than hiding it behind a pointer. */
  reveal?: boolean;
  children: string;
}) {
  const lookup = useFieldNotes();
  const def = lookup?.(field, sectionId);
  if (!def) return <>{children}</>;
  if (reveal)
    return (
      <>
        {children}
        <span className="mt-hair block font-sans text-sm text-ink-faint">{def}</span>
      </>
    );
  return (
    <Tooltip label={def} wrap>
      <span className="underline decoration-rule decoration-dotted underline-offset-[3px] transition-colors duration-150 hover:decoration-ink">
        {children}
      </span>
    </Tooltip>
  );
}

export function DataTable({
  rows,
  hideEmpty,
  showDefinitions,
  sectionId,
  caption,
}: {
  rows: Row[];
  hideEmpty?: boolean;
  showDefinitions?: boolean;
  sectionId?: string;
  caption?: string;
}) {
  const visible = hideEmpty ? rows.filter((r) => !isUnreported(r.v)) : rows;
  if (!visible.length)
    return <p className="text-sm italic text-ink-faint">Every field here was withheld.</p>;

  return (
    <Table cols={["32%", "auto"]}>
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead>
        <tr>
          <Th>Field</Th>
          <Th>Value</Th>
        </tr>
      </thead>
      <tbody>
        {visible.map((r, i) => {
          const empty = isUnreported(r.v);
          return (
            <tr
              key={`${r.k}-${i}`}
              className="align-top transition-colors duration-100 hover:bg-sunken/60"
            >
              <Td mono className={cx("break-words", empty ? "text-ink-faint" : "text-ink-muted")}>
                <Term field={r.k} sectionId={sectionId} reveal={showDefinitions}>
                  {r.k}
                </Term>
              </Td>
              <Td mono className="text-ink">
                <Value v={r.v} />
                {/*
                  * A gloss, not a column. These notes are units, caveats and
                  * provenance about the value — "logical cores", "frozen to
                  * 'Gecko'", "coarsened against timing attacks" — so they
                  * belong beside the thing they qualify. As a third column
                  * they were mostly empty, took a fifth of the width from the
                  * column that needed it most, appeared in some tables and not
                  * others, and vanished below the small breakpoint into this
                  * same inline form. One presentation, every table, every
                  * width.
                  */}
                {r.n && (
                  <span className="ml-tight font-sans text-sm text-ink-faint">{r.n}</span>
                )}
              </Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

/** Roughly how tall a section will be, so deferred rendering does not lie. */
function estimateHeight(section: Section, hideEmpty?: boolean) {
  const rows = hideEmpty
    ? section.rows.filter((r) => !isUnreported(r.v)).length
    : section.rows.length;
  const heading = 32;
  const note = section.note ? Math.ceil(section.note.length / 90) * 22 + 12 : 0;
  const table = 34 + rows * 33;
  return heading + note + table + 40;
}

function SectionBlockBase({
  section,
  hideEmpty,
  showDefinitions,
}: {
  section: Section;
  hideEmpty?: boolean;
  showDefinitions?: boolean;
}) {
  const missing = section.rows.filter((r) => isUnreported(r.v)).length;
  return (
    <section
      id={section.id}
      className="defer-render mb-group"
      style={{ containIntrinsicSize: `auto ${estimateHeight(section, hideEmpty)}px` }}
    >
      <div className="flex items-baseline justify-between gap-body">
        <h5 className="flex items-baseline gap-tight text-base font-semibold tracking-tight">
          {section.title}
          {LIVE_SECTIONS.has(section.id) && (
            <span
              className="inline-flex items-baseline gap-hair text-xs font-normal text-ink-faint"
              title="These values update as they change"
            >
              <span
                aria-hidden
                className="size-1 shrink-0 self-center rounded-full bg-ink-faint
                           motion-safe:animate-[breathe_2.8s_ease-in-out_infinite]"
              />
              live
            </span>
          )}
        </h5>
        <span className="shrink-0 text-xs text-ink-faint tabular">
          {section.rows.length - missing} reported
          {missing > 0 && ` · ${missing} not`}
        </span>
      </div>
      {section.note && (
        <p className="mt-tight mb-body max-w-wide text-sm text-ink-muted">
          {section.note}
        </p>
      )}
      <DataTable
        rows={section.rows}
        hideEmpty={hideEmpty}
        showDefinitions={showDefinitions}
        sectionId={section.id}
        caption={section.title}
      />
    </section>
  );
}

/** Sections are re-rendered only when their own data changes. */
export const SectionBlock = memo(SectionBlockBase);
