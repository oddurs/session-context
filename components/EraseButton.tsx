"use client";

import { useState } from "react";
import { eraseEverything, type ErasureResult } from "@/lib/advanced";
import { Button, Table, Td, Th, cx } from "./ui";
import { Icon } from "./Icon";

/** Seven stores this page writes, plus the one the server hides in the cache. */
const TOTAL = 8;

function Held({ value }: { value?: string }) {
  if (!value) return <span className="italic text-ink-faint">nothing</span>;
  return <span className="tabular">{value}</span>;
}

/**
 * The page stores a respawning identifier on real visitors. It should be able
 * to take it back, and the list of what had to be cleared makes the point
 * better than the paragraph describing it.
 *
 * Each store is read again after it is cleared, so every line is a measurement
 * rather than a claim. That matters most for the last one, which does not go —
 * and which this panel used to write off in a footnote while telling you that
 * reloading would make you a stranger again. It will not.
 */
export function EraseButton({ identifier }: { identifier?: string }) {
  const [results, setResults] = useState<ErasureResult[] | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setResults([]);
    try {
      // Reported one at a time: watching how many separate places have to be
      // emptied is the demonstration, and it used to happen invisibly.
      await eraseEverything((result) => setResults((prev) => [...(prev ?? []), result]));
    } finally {
      setBusy(false);
    }
  };

  const done = !busy && results !== null && results.length > 0;
  const cleared = results?.filter((r) => r.cleared).length ?? 0;
  const survivor = results?.find((r) => !r.cleared);

  return (
    <section id="erase" className="border-t border-ink pt-body">
      <h2 className="text-xl font-semibold tracking-tight">Take it back</h2>
      <p className="mt-tight mb-body max-w-text text-sm text-ink-muted">
        This page wrote one identifier into seven places on your machine, and the
        server put an eighth into your browser&rsquo;s cache. Writing it eight
        times is the point: clearing one does not clear the rest, and whichever
        copy survives restores the others on your next visit. Empty them here and
        watch which one will not go.
        {identifier && (
          <>
            {" "}
            Yours is <span className="code text-ink">{identifier}</span>.
          </>
        )}
      </p>

      <Button onClick={() => void run()} disabled={busy}>
        <Icon name="shield" className="size-3.5" />
        {busy ? "Erasing…" : "Erase everything this page stored"}
      </Button>
      <p className="mt-tight max-w-text text-sm text-ink-faint">
        This site&rsquo;s data only, and only on this machine.
      </p>

      {results !== null && results.length > 0 && (
        <div className="mt-body max-w-text">
          <Table cols={["31%", "auto", "auto"]}>
            <thead>
              <tr>
                <Th>Store</Th>
                <Th>Held</Th>
                <Th>After</Th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr
                  key={r.store}
                  className="align-top motion-safe:animate-[rise-in_200ms_ease-out]"
                >
                  <Td className="text-sm text-ink-muted">{r.store}</Td>
                  <Td mono className="text-sm">
                    <Held value={r.before} />
                  </Td>
                  <Td mono className={cx("text-sm", r.cleared && "text-ink-faint")}>
                    {r.cleared ? <span className="italic">gone</span> : <Held value={r.after} />}
                    {r.note && (
                      <span className="mt-hair block font-sans text-ink-faint">{r.note}</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>

          {done && (
            <div className="mt-body border-t border-rule pt-body">
              <p className="text-lg font-medium tracking-tight">
                {cleared} of {TOTAL} emptied{survivor ? ", and one did not" : ""}.
              </p>
              {survivor ? (
                <>
                  <p className="mt-tight max-w-text text-sm text-ink-muted">
                    The survivor is not site data, which is why none of the
                    controls that emptied the other seven reach it. Reload and
                    this page will give the seven it can write a brand-new
                    identifier — while the server answers with the same{" "}
                    <span className="code text-ink">
                      {survivor.after ?? survivor.before}
                    </span>{" "}
                    it issued before, and counts the visit. The persistence table
                    will show both: a new identifier, and an ETag that has seen
                    you already.
                  </p>
                  <Button className="mt-body" onClick={() => location.reload()}>
                    <Icon name="refresh" className="size-3.5" />
                    Reload and see what comes back
                  </Button>
                </>
              ) : (
                <p className="mt-tight max-w-text text-sm text-ink-muted">
                  Every copy is gone, the one in the HTTP cache included — so this
                  browser clears its cache alongside site data, which is unusual
                  and in your favour.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
