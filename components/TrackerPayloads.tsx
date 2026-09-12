"use client";

import { useMemo } from "react";
import { useClientValue } from "@/lib/use-client-value";
import type { Section } from "@/lib/types";
import { buildTrackerPayloads } from "@/lib/trackers";
import { Badge, Card, CodeBlock, Disclosure } from "./ui";
import { Icon } from "./Icon";

/**
 * The requests real tags would fire about this visitor, built from the data
 * already on the page and never sent. No third party is contacted.
 */
export function TrackerPayloads({ sections }: { sections: Section[] }) {
  // Payloads embed timestamps and request ids, so they are built in the browser
  // only — rendering them during SSR would desynchronise hydration.
  const mounted = useClientValue(() => true, false);
  const payloads = useMemo(
    () => (mounted ? buildTrackerPayloads(sections) : []),
    [sections, mounted]
  );
  if (!mounted || !sections.length) return null;

  return (
    <section id="trackers" className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink pb-1.5">
        <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <Icon name="megaphone" className="size-4 text-ink-muted" />
          What a tracker would send about you
        </h3>
        <Badge tone="outline">constructed here · never sent</Badge>
      </div>
      <p className="mt-2 mb-3 max-w-[78ch] text-sm leading-relaxed text-ink-muted">
        These are the actual request shapes used by the most widely deployed
        analytics and advertising tags, filled in with the values collected from
        you on this page. They are rendered for inspection and go nowhere: this
        site never contacts another company.
      </p>
      <div className="space-y-3">
        {payloads.map((p) => (
          <Card key={p.id} className="p-4">
            <h4 className="text-base font-medium">{p.vendor}</h4>
            <p className="mt-1.5 max-w-[76ch] text-sm leading-relaxed text-ink-muted">{p.note}</p>
            <p className="mt-2 font-mono text-sm text-ink-muted break-all">{p.endpoint}</p>
            <Disclosure className="mt-2" summary="Show the full payload">
              <CodeBlock>{p.body}</CodeBlock>
            </Disclosure>
          </Card>
        ))}
      </div>
    </section>
  );
}
