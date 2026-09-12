"use client";

import { useState } from "react";
import { eraseEverything, type ErasureResult } from "@/lib/advanced";
import { Button, Table, Td } from "./ui";
import { Icon } from "./Icon";

/**
 * The page stores a respawning identifier on real visitors. It should be able
 * to take it back, and the list of what had to be cleared makes the point
 * better than the paragraph describing it.
 */
export function EraseButton() {
  const [results, setResults] = useState<ErasureResult[] | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      setResults(await eraseEverything());
    } finally {
      setBusy(false);
    }
  };

  const cleared = results?.filter((r) => r.cleared).length ?? 0;

  return (
    <div className="mt-10 border-t border-rule pt-5">
      <h3 className="text-base font-medium">Take it back</h3>
      <p className="mt-1 mb-3 max-w-[72ch] text-sm leading-relaxed text-ink-muted">
        This page wrote an identifier into seven places on your machine to
        demonstrate that clearing one does not clear the rest. You can undo
        that here, and watch how many separate stores have to be emptied.
      </p>
      <Button onClick={() => void run()} disabled={busy}>
        <Icon name="shield" className="size-3.5" />
        {busy ? "Erasing…" : "Erase everything this page stored"}
      </Button>

      {results && (
        <div className="mt-4 max-w-[72ch]">
          <p className="text-sm text-ink-muted">
            {cleared} of {results.length} stores cleared. Reload and the page
            will treat you as a first-time visitor — except where noted.
          </p>
          <Table cols={["34%", "auto"]} className="mt-2">
            <tbody>
              {results.map((r) => (
                <tr key={r.store} className="align-top">
                  <Td className="text-sm text-ink-muted">{r.store}</Td>
                  <Td className="text-sm">
                    {r.cleared ? "cleared" : "not cleared"}
                    {r.note && (
                      <span className="mt-0.5 block text-ink-faint">{r.note}</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
