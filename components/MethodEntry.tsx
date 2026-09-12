import { Fragment } from "react";
import type { NumberedMethod } from "@/lib/methods";

/** Render `backticked` spans as inline code — the only mono on this page. */
function Text({ children }: { children: string }) {
  return (
    <>
      {children.split(/(`[^`]+`)/g).map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code key={i} className="font-mono text-[0.95em] text-ink">
            {part.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

/**
 * One technique as a reference entry.
 *
 * A finding is a single statement about the reader, so it reads as a headline
 * and a paragraph. A method is three different facts — what it exposes, how it
 * works, where defenses stand — and flattening those into undifferentiated
 * prose made them illegible. They get a label column instead, and nothing is
 * hidden behind a disclosure: where defenses stand is the most interesting
 * column on the page, and it should be readable down the whole list.
 */
export function MethodEntry({ method }: { method: NumberedMethod }) {
  const rows = [
    { label: "Exposes", body: method.reveals, tone: "text-ink" },
    { label: "Mechanism", body: method.how, tone: "text-ink-muted" },
    { label: "Defenses", body: method.status, tone: "text-ink-muted" },
  ];

  return (
    <article id={method.slug} className="border-t border-rule py-6 first:border-t-0 first:pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="flex items-baseline gap-3 text-lg font-medium leading-snug tracking-tight">
          <span className="font-mono text-sm text-ink-faint tabular">{method.number}</span>
          {method.name}
        </h3>
        <span className="shrink-0 text-sm text-ink-faint">{method.standing}</span>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:pl-[1.75rem]">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-sm text-ink-faint sm:text-right">{row.label}</dt>
            <dd className={`max-w-[70ch] text-sm leading-relaxed ${row.tone}`}>
              <Text>{row.body}</Text>
            </dd>
          </div>
        ))}
      </dl>

      {method.section && (
        <div className="mt-3 sm:pl-[10.25rem]">
          <a
            href={`/#${method.section}`}
            className="text-sm text-ink-muted no-underline hover:text-ink hover:underline"
          >
            See the data →
          </a>
        </div>
      )}
    </article>
  );
}
