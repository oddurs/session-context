"use client";

import { memo, useState } from "react";
import type { Row, Section } from "@/lib/types";
import { lookupTerm } from "@/lib/glossary";
import { Icon } from "./Icon";
import { Table, Td, Th, Tooltip, cx } from "./ui";

const LONG = 240;

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

function Value({ v }: { v: unknown }) {
  const [open, setOpen] = useState(false);

  if (v === undefined) return <span className="text-ink-faint italic">not reported</span>;
  if (v === null) return <span className="text-ink-faint italic">null — not reported</span>;
  if (v === "") return <span className="text-ink-faint italic">empty</span>;
  if (typeof v === "boolean")
    return <span className={v ? "font-semibold" : "text-ink-muted"}>{v ? "yes" : "no"}</span>;

  const text = typeof v === "object" ? JSON.stringify(v, null, 2) : String(v);
  if (isUnreported(text)) return <span className="text-ink-faint italic">{text}</span>;

  if (text.length > LONG) {
    return (
      <>
        {open ? text : `${text.slice(0, LONG)}…`}{" "}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="underline decoration-rule-strong underline-offset-2 hover:decoration-ink"
        >
          {open ? "less" : `show all ${text.length} chars`}
        </button>
      </>
    );
  }
  return <>{text}</>;
}

function Term({ field }: { field: string }) {
  const def = lookupTerm(field);
  if (!def) return null;
  return (
    <Tooltip label={def}>
      <Icon name="info" className="ml-1 size-3 text-ink-faint hover:text-ink" />
    </Tooltip>
  );
}

export function DataTable({ rows, hideEmpty }: { rows: Row[]; hideEmpty?: boolean }) {
  const visible = hideEmpty ? rows.filter((r) => !isUnreported(r.v)) : rows;
  const hasNotes = visible.some((r) => r.n);
  if (!visible.length)
    return <p className="text-sm text-ink-faint italic">Every field here was withheld.</p>;

  // Nothing scrolls sideways: every column wraps, and on narrow screens the
  // note moves underneath the value instead of squeezing a third column.
  return (
    <Table cols={hasNotes ? ["28%", "auto", "22%"] : ["30%", "auto"]}>
      <thead>
        <tr>
          <Th>Field</Th>
          <Th>Value</Th>
          {hasNotes && <Th className="hidden sm:table-cell">What it means</Th>}
        </tr>
      </thead>
      <tbody>
        {visible.map((r, i) => {
          const empty = isUnreported(r.v);
          return (
            <tr key={`${r.k}-${i}`} className="align-top hover:bg-sunken/70">
              <Td mono className={cx(empty && "text-ink-faint")}>
                {r.k}
                <Term field={r.k} />
              </Td>
              <Td mono className="whitespace-pre-wrap">
                <Value v={r.v} />
                {hasNotes && r.n && (
                  <span className="mt-1 block font-sans text-sm text-ink-faint sm:hidden">
                    {r.n}
                  </span>
                )}
              </Td>
              {hasNotes && (
                <Td className={cx("hidden text-sm sm:table-cell", empty ? "text-ink-faint" : "text-ink-muted")}>
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
        <h5 className="text-base font-semibold tracking-tight">{section.title}</h5>
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
      <DataTable rows={section.rows} hideEmpty={hideEmpty} />
    </section>
  );
}

/** Sections are re-rendered only when their own data changes. */
export const SectionBlock = memo(SectionBlockBase);
