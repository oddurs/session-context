"use client";

import type { Phase } from "@/lib/collect";
import { Disclosure, cx } from "./ui";

const PASSES = [
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
    <li className="border-t border-rule py-2 first:border-t-0">
      <div className="flex items-baseline gap-3">
        <span
          aria-hidden
          className={cx(
            "mt-[0.3rem] size-1.5 shrink-0 rounded-full transition-colors duration-300",
            state === "done" && "bg-ink-muted",
            state === "running" && "bg-ink",
            state === "waiting" && "bg-rule-strong"
          )}
        />
        <span
          className={cx(
            "flex-1 text-sm transition-colors duration-300",
            state === "waiting" ? "text-ink-faint" : "text-ink"
          )}
        >
          {label}
        </span>
        {fields !== undefined && (
          <span className="shrink-0 whitespace-nowrap font-mono text-sm tabular text-ink-faint motion-safe:animate-[rise-in_200ms_ease-out]">
            {fields.toLocaleString()} fields
          </span>
        )}
        {at !== undefined && (
          <span className="w-[4.75rem] shrink-0 whitespace-nowrap text-right font-mono text-sm tabular text-ink-faint motion-safe:animate-[rise-in_200ms_ease-out]">
            {Math.round(at)} ms
          </span>
        )}
      </div>

      {/* The running pass gets a moving hairline: something is happening, and
          how long it will take is genuinely unknown. */}
      <div
        aria-hidden
        className={cx(
          "mt-1.5 ml-[0.6rem] h-px overflow-hidden transition-opacity duration-300",
          state === "running" ? "bg-rule opacity-100" : "opacity-0"
        )}
      >
        <div className="h-px w-1/5 bg-ink animate-[sweep_1.4s_ease-in-out_infinite]" />
      </div>
    </li>
  );
}

/**
 * The wait is the demonstration: rather than a placeholder, the page says what
 * it is doing to you while it does it.
 */
export function CollectionLog({ phases }: { phases: Phase[] }) {
  const done = new Set(phases.map((p) => p.id));
  const next = PASSES.find((p) => !done.has(p.id));

  return (
    <section aria-live="polite" aria-label="Collection progress">
      <h3 className="text-base font-medium">Collecting</h3>
      <p className="mt-1 mb-3 max-w-[70ch] text-sm leading-relaxed text-ink-muted">
        None of this asks your permission. The findings appear as soon as the
        last pass lands.
      </p>
      <ul className="max-w-[72ch]">
        {PASSES.map((p) => {
          const finished = phases.find((x) => x.id === p.id);
          return (
            <Line
              key={p.id}
              label={p.label}
              at={finished?.at}
              fields={finished?.fields}
              state={finished ? "done" : p.id === next?.id ? "running" : "waiting"}
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
