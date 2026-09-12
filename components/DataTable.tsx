"use client";

import { memo, useState } from "react";
import type { Row, Section } from "@/lib/types";
import { lookupTerm } from "@/lib/glossary";
import { LIVE_SECTIONS } from "@/lib/live";
import { Icon } from "./Icon";
import { Json, looksLikeJson } from "./Json";
import { Table, Td, Th, Tooltip, cx } from "./ui";

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
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="whitespace-nowrap text-ink-muted underline decoration-rule-strong underline-offset-2 hover:text-ink"
        >
          {open ? "less" : `show all ${text.length}`}
        </button>
      </>
    );
  }
  return (
    <span className={cx("[overflow-wrap:anywhere]", NUMERIC.test(text) && "tabular")}>{text}</span>
  );
}

function Term({ field, sectionId }: { field: string; sectionId?: string }) {
  const def = lookupTerm(field, sectionId);
  if (!def) return null;
  return (
    <Tooltip label={def}>
      <Icon name="info" className="ml-1 size-3 text-ink-faint hover:text-ink" />
    </Tooltip>
  );
}

export function DataTable({
  rows,
  hideEmpty,
  sectionId,
  caption,
}: {
  rows: Row[];
  hideEmpty?: boolean;
  sectionId?: string;
  caption?: string;
}) {
  const visible = hideEmpty ? rows.filter((r) => !isUnreported(r.v)) : rows;
  if (!visible.length)
    return <p className="text-sm italic text-ink-faint">Every field here was withheld.</p>;

  // A third column is only worth its width when most rows have something in it.
  const noted = visible.filter((r) => r.n).length;
  const noteColumn = noted / visible.length >= 0.25;

  return (
    <Table cols={noteColumn ? ["27%", "auto", "23%"] : ["30%", "auto"]}>
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead>
        <tr>
          <Th>Field</Th>
          <Th>Value</Th>
          {noteColumn && <Th className="hidden sm:table-cell">What it means</Th>}
        </tr>
      </thead>
      <tbody>
        {visible.map((r, i) => {
          const empty = isUnreported(r.v);
          return (
            <tr key={`${r.k}-${i}`} className="align-top hover:bg-sunken/70">
              <Td
                mono
                className={cx("break-words", empty ? "text-ink-faint" : "text-ink-muted")}
              >
                {r.k}
                <Term field={r.k} sectionId={sectionId} />
              </Td>
              <Td mono className="text-ink">
                <Value v={r.v} />
                {r.n && !noteColumn && (
                  <span className="mt-0.5 block font-sans text-sm text-ink-faint">{r.n}</span>
                )}
                {r.n && noteColumn && (
                  <span className="mt-0.5 block font-sans text-sm text-ink-faint sm:hidden">
                    {r.n}
                  </span>
                )}
              </Td>
              {noteColumn && (
                <Td
                  className={cx(
                    "hidden font-sans text-sm sm:table-cell",
                    empty ? "text-ink-faint" : "text-ink-muted"
                  )}
                >
                  {r.n ?? ""}
                </Td>
              )}
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

function SectionBlockBase({ section, hideEmpty }: { section: Section; hideEmpty?: boolean }) {
  const missing = section.rows.filter((r) => isUnreported(r.v)).length;
  return (
    <section id={section.id} className="mb-10">
      <div className="flex items-baseline justify-between gap-4">
        <h5 className="flex items-baseline gap-2 text-base font-semibold tracking-tight">
          {section.title}
          {LIVE_SECTIONS.has(section.id) && (
            <span
              className="text-xs font-normal text-ink-faint"
              title="These values update as they change"
            >
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
        <p className="mt-1.5 mb-3 max-w-[78ch] text-sm leading-relaxed text-ink-muted">
          {section.note}
        </p>
      )}
      <DataTable
        rows={section.rows}
        hideEmpty={hideEmpty}
        sectionId={section.id}
        caption={section.title}
      />
    </section>
  );
}

/** Sections are re-rendered only when their own data changes. */
export const SectionBlock = memo(SectionBlockBase);
