"use client";

import { useCallback, useEffect } from "react";
import { CSS_PROBES, buildProbeCss } from "@/lib/css-probes";
import type { Row, Section } from "@/lib/types";

/**
 * Renders the probe stylesheet and its target elements, then asks the server
 * what it saw. The fingerprinting happens entirely in CSS — the JavaScript
 * here only fetches the report so it can be displayed.
 */
export function CssProbe({
  probeKey,
  onResult,
  nonce,
}: {
  probeKey: string;
  onResult: (s: Section) => void;
  nonce?: string;
}) {
  const report = useCallback(async () => {
    try {
      const res = await fetch(`/api/css-report?s=${encodeURIComponent(probeKey)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      const features: Record<string, number> = data.features ?? {};
      const hit = CSS_PROBES.filter((p) => features[p.id]);
      const rows: Row[] = [
        { k: "probes in the stylesheet", v: CSS_PROBES.length },
        { k: "probes that matched", v: hit.length },
        { k: "first seen by the server", v: data.firstSeen },
        { k: "javascript was disabled at some point", v: features["scripting-none"] ? `yes — recorded ${features["scripting-none"]} time(s)` : "no" },
        ...hit.map((p) => ({
          k: p.label,
          v: `${features[p.id]} request${features[p.id] === 1 ? "" : "s"}`,
          n: p.rule,
        })),
      ];
      onResult({
        id: "css-noscript",
        title: "Fingerprinting Without JavaScript",
        note:
          "Every line above was learned from CSS alone. Each rule loads a different image when it matches, so the server can tell which conditions were true from the requests it receives — with scripts blocked, disabled, or never loaded. Turning JavaScript off and reloading adds a row saying exactly that.",
        rows,
      });
    } catch {
      /* report unavailable */
    }
  }, [probeKey, onResult]);

  useEffect(() => {
    // Give the browser time to issue the probe requests before asking the
    // server what it saw.
    const t = setTimeout(report, 1200);
    return () => clearTimeout(t);
  }, [report]);

  return (
    <>
      <style nonce={nonce} dangerouslySetInnerHTML={{ __html: buildProbeCss(probeKey) }} />
      <div aria-hidden className="pointer-events-none absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
        {CSS_PROBES.map((p) => (
          <i key={p.id} id={`cssp-${p.id}`} className="block h-px w-px" />
        ))}
      </div>
    </>
  );
}
