"use client";

import type { Phase } from "@/lib/collect";
import { Disclosure, cx } from "./ui";

const PENDING = [
  { id: "immediate", label: "Reading the browser, screen and document" },
  { id: "quick", label: "Storage, network, devices and permissions" },
  { id: "heavy", label: "Fingerprinting graphics, audio and performance" },
  { id: "identity", label: "Reducing it all to one identifier" },
];

function Line({
  label,
  at,
  fields,
  state,
}: {
  label: string;
  at?: number;
  fields?: number;
  state: "done" | "running" | "waiting";
}) {
  return (
    <li
      className={cx(
        "flex items-baseline gap-3 border-t border-rule py-1.5 first:border-t-0",
        state === "waiting" && "text-ink-faint",
        state === "running" && "text-ink",
        state === "done" && "text-ink-muted"
      )}
    >
      <span
        aria-hidden
        className={cx(
          "mt-[0.35rem] size-1.5 shrink-0 rounded-full",
          state === "done" && "bg-ink-muted",
          state === "running" && "bg-ink motion-safe:animate-pulse",
          state === "waiting" && "bg-rule-strong"
        )}
      />
      <span className="flex-1 text-sm">{label}</span>
      {fields !== undefined && (
        <span className="shrink-0 font-mono text-sm tabular text-ink-faint">
          {fields.toLocaleString()} fields
        </span>
      )}
      {at !== undefined && (
        <span className="w-16 shrink-0 text-right font-mono text-sm tabular text-ink-faint">
          {Math.round(at)} ms
        </span>
      )}
    </li>
  );
}

/**
 * The wait is the demonstration: rather than a placeholder, the page says what
 * it is doing to you while it does it.
 */
export function CollectionLog({ phases }: { phases: Phase[] }) {
  const doneIds = new Set(phases.map((p) => p.id));
  const next = PENDING.find((p) => !doneIds.has(p.id));

  return (
    <section aria-live="polite" aria-label="Collection progress">
      <h3 className="text-base font-medium">Collecting</h3>
      <p className="mt-1 mb-4 max-w-[70ch] text-sm leading-relaxed text-ink-muted">
        None of this asks your permission. The findings appear as soon as the
        last pass lands.
      </p>
      <ul className="max-w-[72ch]">
        {PENDING.map((p) => {
          const done = phases.find((x) => x.id === p.id);
          return (
            <Line
              key={p.id}
              label={p.label}
              at={done?.at}
              fields={done?.fields}
              state={done ? "done" : p.id === next?.id ? "running" : "waiting"}
            />
          );
        })}
      </ul>
    </section>
  );
}

/** After the reveal, the same log folds away into a single receipt. */
export function CollectionReceipt({
  phases,
  elapsed,
}: {
  phases: Phase[];
  elapsed: number;
}) {
  if (!phases.length) return null;
  return (
    <Disclosure
      className="mb-8"
      summary={`Collected in ${Math.round(elapsed)} ms — show what ran`}
    >
      <ul className="max-w-[72ch] border-t border-rule pt-1">
        {phases.map((p) => (
          <Line key={p.id} label={p.label} at={p.at} fields={p.fields} state="done" />
        ))}
      </ul>
    </Disclosure>
  );
}
