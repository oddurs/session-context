"use client";

import type { Finding } from "@/lib/findings";
import { HOW_ICON, ICON_FOR_GROUP } from "@/lib/taxonomy";
import { Icon } from "./Icon";
import { Disclosure, Table, Td } from "./ui";

function Evidence({ f }: { f: Finding }) {
  return (
    <Disclosure
      summary={`${f.evidence.length} value${f.evidence.length === 1 ? "" : "s"} behind this`}
    >
      <div className="max-w-[76ch] border-t border-rule">
        <Table cols={["38%", "auto"]}>
          <tbody>
            {f.evidence.map((e, i) => (
              <tr key={i} className="align-top">
                <Td mono className="text-ink-muted">{e.k}</Td>
                <Td mono className="whitespace-pre-wrap">
                  {e.v === undefined || e.v === null || e.v === "" ? (
                    <span className="italic text-ink-faint">not reported</span>
                  ) : typeof e.v === "boolean" ? (
                    e.v ? "yes" : "no"
                  ) : (
                    String(e.v)
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <a
          href={`#${f.sectionId}`}
          className="mt-2 inline-block text-sm text-ink-muted no-underline hover:text-ink hover:underline"
        >
          Full table →
        </a>
      </div>
    </Disclosure>
  );
}

/**
 * Findings read as a document: one column, hairline separators, hierarchy from
 * type rather than boxes.
 */
export function Findings({ findings, groups }: { findings: Finding[]; groups: string[] }) {
  if (!findings.length) return null;
  return (
    <div>
      {groups.map((g) => {
        const items = findings.filter((f) => f.group === g);
        if (!items.length) return null;
        return (
          <section key={g} className="mt-10 first:mt-0">
            <h3 className="flex items-center gap-2 text-base font-medium text-ink-muted">
              <Icon name={ICON_FOR_GROUP[g] ?? "info"} className="size-4 text-ink-faint" />
              {g}
            </h3>
            <div>
              {items.map((f) => (
                <article key={f.id} className="border-t border-rule py-5 first:border-t-0 first:pt-3">
                  <h4 className="max-w-[58ch] text-lg font-medium leading-snug tracking-tight">
                    {f.headline}
                  </h4>
                  <p className="mt-2 max-w-[72ch] text-sm leading-relaxed text-ink-muted">
                    {f.detail}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                    <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
                      <Icon name={HOW_ICON[f.how] ?? "info"} className="size-3.5" />
                      {f.how}
                    </span>
                    <Evidence f={f} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
