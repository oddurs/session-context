"use client";

import type { Finding } from "@/lib/findings";
import { HOW_ICON, ICON_FOR_GROUP } from "@/lib/taxonomy";
import { Icon } from "./Icon";
import { Badge, Card, Disclosure, Table, Td } from "./ui";

function Evidence({ f }: { f: Finding }) {
  return (
    <Disclosure summary={`The ${f.evidence.length} value${f.evidence.length === 1 ? "" : "s"} behind this`}>
      <div className="border-t border-rule pt-2">
        <Table cols={["34%", "auto"]}>
          <tbody>
            {f.evidence.map((e, i) => (
              <tr key={i} className="align-top">
                <Td mono className="text-ink-muted">{e.k}</Td>
                <Td mono className="whitespace-pre-wrap">
                  {e.v === undefined || e.v === null || e.v === "" ? (
                    <span className="text-ink-faint italic">not reported</span>
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
          className="mt-2 inline-block text-sm text-ink-muted hover:text-ink"
        >
          Open the full table this came from →
        </a>
      </div>
    </Disclosure>
  );
}

export function Findings({ findings, groups }: { findings: Finding[]; groups: string[] }) {
  if (!findings.length) return null;
  return (
    <div className="space-y-10">
      {groups.map((g) => {
        const items = findings.filter((f) => f.group === g);
        if (!items.length) return null;
        return (
          <section key={g}>
            <h2 className="flex items-center gap-2 border-b border-ink pb-1.5 text-lg font-semibold tracking-tight">
              <Icon name={ICON_FOR_GROUP[g] ?? "info"} className="size-4 text-ink-muted" />
              {g}
            </h2>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {items.map((f) => (
                <Card key={f.id} className="flex flex-col gap-2.5 p-4">
                  <h3 className="text-lg font-medium leading-snug tracking-tight">{f.headline}</h3>
                  <p className="text-sm leading-relaxed text-ink-muted">{f.detail}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
                    <Badge tone={f.how === "You granted this" ? "accent" : "neutral"}>
                      <Icon name={HOW_ICON[f.how] ?? "info"} className="size-3" />
                      {f.how}
                    </Badge>
                    <Evidence f={f} />
                  </div>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
