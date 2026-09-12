"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Section } from "@/lib/types";
import {
  collectAll,
  liveCheapSections,
  liveSection,
  probeDeviceLabels,
  probeGeolocation,
  probeLocalFonts,
  sortSections,
} from "@/lib/collect";
import { applyLive, watchLive } from "@/lib/live";
import { useMediaQuery } from "@/lib/use-client-value";
import {
  probeClipboard,
  probeIdle,
  probeSchemes,
  probeScreenDetails,
  probeSensors,
} from "@/lib/advanced";
import { FINDING_GROUPS, deriveFindings } from "@/lib/findings";
import { CATEGORIES } from "@/lib/taxonomy";
import { SectionBlock, isUnreported } from "./DataTable";
import { Json, looksLikeJson } from "./Json";
import { Findings } from "./Findings";
import { CssProbe } from "./CssProbe";
import { ThirdParty } from "./ThirdParty";
import { TrackerPayloads } from "./TrackerPayloads";
import { TypingBiometrics } from "./TypingBiometrics";
import { Icon } from "./Icon";
import { Button, Card, Checkbox, RuleHeading, Table, Td, cx } from "./ui";

/** Raw-data category → the matching group on the methods page. */
const METHODS_GROUP: Record<string, string> = {
  server: "passive",
  identity: "fingerprint",
  browser: "environment",
  device: "environment",
  session: "environment",
  granted: "gated",
};

type Gated = {
  id: string;
  label: string;
  /** what this reveals, shown before you press it */
  reveals: string;
  warn?: string;
  run: () => Promise<Section>;
};

/** The rows worth showing inline when a probe comes back. */
const HIGHLIGHT: Record<string, string[]> = {
  geolocation: ["latitude", "longitude", "accuracy", "timestamp"],
  "local-fonts": ["fonts installed", "families"],
  "device-labels": ["audio track label", "video track label"],
  "screen-details": ["screens attached", "current screen label"],
  clipboard: ["clipboard length", "clipboard contents"],
  idle: ["user state", "screen state"],
  sensors: ["orientation sample", "motion sample"],
  schemes: [],
};

/** Did the browser actually hand anything over? */
function outcomeOf(section: Section): "granted" | "denied" {
  const usable = section.rows.some((r) => {
    if (r.v === undefined || r.v === null || r.v === "") return false;
    const v = String(r.v);
    return !v.startsWith("error:") && v !== "denied" && v !== "prompt" && v !== "not permitted";
  });
  return usable ? "granted" : "denied";
}

const GATED: Gated[] = [
  { id: "geolocation", label: "Precise location", reveals: "where you are, to a few meters", run: probeGeolocation },
  { id: "local-fonts", label: "Installed fonts", reveals: "every typeface on your system", run: probeLocalFonts },
  { id: "device-labels", label: "Camera + microphone", reveals: "hardware names and permanent IDs", run: probeDeviceLabels },
  { id: "screen-details", label: "All displays", reveals: "your whole desk setup", run: probeScreenDetails },
  { id: "clipboard", label: "Clipboard contents", reveals: "whatever you last copied", run: probeClipboard },
  { id: "idle", label: "Idle / lock state", reveals: "whether you are at the keyboard", run: probeIdle },
  { id: "sensors", label: "Motion sensors", reveals: "readings unique to this physical device", run: probeSensors },
  {
    id: "schemes",
    label: "Installed desktop apps",
    reveals: "which applications you have installed",
    warn:
      "This probe asks your browser to open the private URL of a dozen desktop applications (Slack, Zoom, Spotify, Discord and others) and watches which ones respond. Some of them may actually launch. Continue?",
    run: probeSchemes,
  },
];

/**
 * Tracks the section currently under the top of the viewport, the way
 * documentation sidebars do.
 *
 * Offsets are measured once and cached: reading layout on every scroll frame
 * forces a reflow and makes scrolling stutter.
 */
function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState("");
  const offsets = useRef<{ id: string; top: number }[]>([]);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      offsets.current = ids
        .map((id) => {
          const el = document.getElementById(id);
          return el ? { id, top: el.getBoundingClientRect().top + window.scrollY } : null;
        })
        .filter((v): v is { id: string; top: number } => v !== null)
        .sort((a, b) => a.top - b.top);
      pick();
    };

    // Pure arithmetic on cached numbers: no layout is read here.
    const pick = () => {
      frame = 0;
      const y = window.scrollY + 96;
      let current = offsets.current[0]?.id ?? "";
      for (const entry of offsets.current) {
        if (entry.top <= y) current = entry.id;
        else break;
      }
      setActive((prev) => (prev === current ? prev : current));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(pick);
    };

    measure();
    // Content keeps arriving as collection finishes, so re-measure when idle.
    const remeasure = setTimeout(measure, 1500);

    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", measure);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", measure);
      clearTimeout(remeasure);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ids]);

  return active;
}

export function ClientProbe({
  serverSections,
  probeKey,
}: {
  serverSections: Section[];
  probeKey: string;
}) {
  const [sections, setSections] = useState<Section[]>([]);
  const [extra, setExtra] = useState<Section[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<
    Record<string, { status: "granted" | "denied"; section: Section }>
  >({});
  const [collectedAt, setCollectedAt] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [hideEmpty, setHideEmpty] = useState(false);
  const [live, setLive] = useState<Section[]>([]);

  const collect = useCallback(async () => {
    setBusy("collect");
    setError(null);
    const t0 = performance.now();
    try {
      // Partial results render as they arrive, so the page is never blank.
      const s = await collectAll(setSections);
      setSections(s);
      setElapsed(performance.now() - t0);
      setCollectedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    // Collection is the page's whole purpose; it starts as soon as we mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void collect();
  }, [collect]);

  // Anything that can change while you sit here does: cheap values are re-read
  // on a timer, the rest when the browser reports the change.
  useEffect(() => {
    const merge = (next: Section[]) =>
      setLive((prev) => {
        const byId = new Map(prev.map((s) => [s.id, s]));
        for (const s of next) byId.set(s.id, s);
        return [...byId.values()];
      });

    const timer = setInterval(() => merge(liveCheapSections()), 1000);
    const stop = watchLive((kind) => {
      if (kind === "cheap") merge(liveCheapSections());
      else void liveSection(kind).then(merge);
    });

    return () => {
      clearInterval(timer);
      stop();
    };
  }, []);

  const addSection = useCallback((s: Section) => {
    setExtra((prev) => sortSections([...prev.filter((p) => p.id !== s.id), s]));
  }, []);

  const runGated = async (g: Gated) => {
    if (g.warn && !window.confirm(g.warn)) return;
    setBusy(g.id);
    try {
      const section = await g.run();
      addSection(section);
      setOutcomes((prev) => ({ ...prev, [g.id]: { status: outcomeOf(section), section } }));
    } finally {
      setBusy(null);
    }
  };

  const base = useMemo(
    () => sortSections([...serverSections, ...sections, ...extra]),
    [serverSections, sections, extra]
  );

  // Live sections replace their collected counterparts; every other section
  // keeps its object identity, so the memoised tables do not re-render.
  const all = useMemo(() => applyLive(base, live), [base, live]);

  const findings = useMemo(() => deriveFindings(all), [all]);
  const fieldCount = all.reduce((n, s) => n + s.rows.length, 0);
  const reported = all.reduce(
    (n, s) => n + s.rows.filter((r) => !isUnreported(r.v)).length,
    0
  );

  // Every anchor in reading order: the findings, then each category and the
  // tables inside it.
  // The index is open beside the content on wide screens and collapsed above
  // it on narrow ones. Set imperatively so a re-render never reopens it.
  const isWide = useMediaQuery("(min-width: 1024px)", true);
  const toc = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (toc.current) toc.current.open = isWide;
  }, [isWide]);

  const navIds = useMemo(() => {
    const ids = ["plain"];
    for (const c of CATEGORIES) {
      const present = all.filter((s) => s.group === c.title);
      if (!present.length) continue;
      ids.push(`cat-${c.id}`, ...present.map((s) => s.id));
    }
    return ids;
  }, [all]);
  const activeId = useScrollSpy(navIds);

  // Which category the active anchor belongs to.
  const activeCategory = useMemo(() => {
    if (activeId.startsWith("cat-")) return activeId.slice(4);
    const section = all.find((s) => s.id === activeId);
    return CATEGORIES.find((c) => c.title === section?.group)?.id ?? "";
  }, [activeId, all]);

  const asJSON = () => ({
    collectedAt,
    plainEnglish: findings.map((f) => ({
      group: f.group,
      finding: f.headline,
      explanation: f.detail,
      how: f.how,
      evidence: Object.fromEntries(f.evidence.map((e) => [e.k, e.v ?? null])),
    })),
    raw: all.map((s) => ({
      id: s.id,
      category: s.group,
      subsection: s.subgroup,
      title: s.title,
      fields: Object.fromEntries(s.rows.map((r) => [r.k, r.v ?? null])),
    })),
  });

  const copyJSON = () => void navigator.clipboard.writeText(JSON.stringify(asJSON(), null, 2));
  const downloadJSON = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(asJSON(), null, 2)], { type: "application/json" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-context-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const dateline = [
    { label: "Findings", value: findings.length },
    { label: "Details observed", value: reported.toLocaleString() },
    { label: "Fields checked", value: fieldCount.toLocaleString() },
    { label: "Tables", value: all.length },
    { label: "Collected in", value: elapsed ? `${elapsed.toFixed(0)} ms` : "…" },
    { label: "At", value: collectedAt || "…" },
  ];

  return (
    <>
      <CssProbe probeKey={probeKey} onResult={addSection} />

      {/* dateline: the scale of the thing, stated once */}
      <dl className="grid grid-cols-2 gap-y-4 border-b border-rule py-4 sm:grid-cols-3 lg:grid-cols-6">
        {dateline.map((d, i) => (
          <div
            key={d.label}
            className={cx(
              "min-w-0",
              i > 0 && "lg:border-l lg:border-rule lg:pl-5",
              i % 2 === 1 && "border-l border-rule pl-5 sm:border-l-0 sm:pl-0 lg:border-l lg:pl-5"
            )}
          >
            <dt className="text-xs text-ink-faint">{d.label}</dt>
            <dd className="mt-1 truncate text-[1.05rem] font-medium leading-none tracking-[-0.01em] tabular">
              {d.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* sticky bar: where you are, and what you can do about it */}
      <div className="sticky top-0 z-40 -mx-4 mb-10 border-b border-rule bg-paper px-4 py-2 sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-page items-center gap-4">
          <button
            type="button"
            title="Back to the top"
            onClick={() => scrollTo({ top: 0 })}
            className="truncate text-left text-sm text-ink-muted hover:text-ink"
          >
            {activeId === "plain" || !activeId
              ? "In plain English"
              : [
                  CATEGORIES.find((c) => c.id === activeCategory)?.title,
                  all.find((s) => s.id === activeId)?.title,
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
          </button>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="quiet" onClick={() => void collect()} disabled={busy !== null}>
              <Icon name="refresh" className="size-3.5" />
              {busy === "collect" ? "Collecting…" : "Re-collect"}
            </Button>
            <Button variant="quiet" onClick={copyJSON} disabled={!sections.length}>
              <Icon name="copy" className="size-3.5" />
              Copy JSON
            </Button>
            <Button variant="quiet" onClick={downloadJSON} disabled={!sections.length}>
              <Icon name="download" className="size-3.5" />
              Download
            </Button>
          </div>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        {/* contents rail */}
        <nav aria-label="Contents" className="mb-10 lg:sticky lg:top-14 lg:mb-0 lg:self-start">
          {/* Collapsed on small screens: a full index above the content pushes
              the page itself off the first screen. */}
          <details ref={toc} className="group/toc">
            <summary className="label flex cursor-pointer list-none items-center justify-between border-b border-rule pb-1.5 lg:pointer-events-none">
              Contents
              <span className="text-ink-faint lg:hidden">
                {all.length} tables
              </span>
            </summary>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <a
                href="#plain"
                className={cx(
                  "block border-l py-0.5 pl-3 no-underline transition-colors hover:text-ink",
                  activeId === "plain"
                    ? "border-ink font-medium text-ink"
                    : "border-transparent text-ink-muted"
                )}
              >
                In plain English
              </a>
            </li>
            {CATEGORIES.map((c) => {
              const present = all.filter((s) => s.group === c.title);
              if (!present.length) return null;
              const on = activeCategory === c.id;
              return (
                <li key={c.id}>
                  <a
                    href={`#cat-${c.id}`}
                    className={cx(
                      "flex items-baseline gap-2 border-l py-0.5 pl-3 no-underline transition-colors hover:text-ink",
                      on ? "border-ink font-medium text-ink" : "border-transparent text-ink-muted"
                    )}
                  >
                    <span className="flex-1">{c.title}</span>
                    <span className="text-xs text-ink-faint tabular">{present.length}</span>
                  </a>
                  {on && (
                    <ul className="mb-1">
                      {present.map((s) => (
                        <li key={s.id}>
                          <a
                            href={`#${s.id}`}
                            className={cx(
                              "block border-l py-0.5 pl-6 text-sm no-underline transition-colors hover:text-ink",
                              activeId === s.id
                                ? "border-ink text-ink"
                                : "border-rule text-ink-muted"
                            )}
                          >
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          </details>
        </nav>

        <div className="min-w-0">
          {/* plain English */}
          <section id="plain" className="mb-14">
            <h2 className="text-xl font-semibold tracking-tight">In plain English</h2>
            <p className="mt-1 mb-8 max-w-[72ch] text-sm leading-relaxed text-ink-muted">
              What this page worked out about you, in the order it matters. Every
              statement expands to the exact values it came from.
            </p>
            {error ? (
              <div className="border border-rule bg-raised p-4">
                <p className="text-base font-medium">Collection failed.</p>
                <p className="mt-1 max-w-[70ch] font-mono text-sm text-ink-muted">{error}</p>
                <Button className="mt-3" onClick={() => void collect()}>
                  Try again
                </Button>
              </div>
            ) : findings.length === 0 ? (
              <div aria-busy="true" className="space-y-6">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="border-t border-rule pt-5 first:border-t-0 first:pt-0">
                    <div className="h-4 w-2/3 animate-pulse bg-sunken" />
                    <div className="mt-3 h-3 w-full animate-pulse bg-sunken" />
                    <div className="mt-1.5 h-3 w-5/6 animate-pulse bg-sunken" />
                  </div>
                ))}
                <p className="text-sm text-ink-faint">
                  Measuring… {all.length} of 40 tables collected so far.
                </p>
              </div>
            ) : (
              <Findings findings={findings} groups={FINDING_GROUPS} />
            )}

            <div className="mt-10 border-t border-rule pt-5">
              <h3 className="text-base font-medium">Try it yourself</h3>
              <p className="mt-1 mb-4 max-w-[72ch] text-sm leading-relaxed text-ink-muted">
                One measurement needs your participation. The result appears in
                place, below the box.
              </p>
              <TypingBiometrics onResult={addSection} />
            </div>
          </section>

          {/* the boundary that actually matters */}
          <section className="mb-14 border-y border-rule py-5">
            <h2 className="text-base font-medium">
              Everything above this point needed no permission.
            </h2>
            <p className="mt-1 mb-4 max-w-[72ch] text-sm leading-relaxed text-ink-muted">
              Not one prompt was shown, and nothing you did granted consent. These
              are the capabilities that do ask first — press one to see what a
              single approval hands over.
            </p>
            <ul className="flex flex-wrap gap-2">
              {GATED.map((g) => {
                const outcome = outcomes[g.id];
                return (
                  <li key={g.id}>
                    <Button
                      onClick={() => void runGated(g)}
                      disabled={busy !== null}
                      title={`Reveals ${g.reveals}`}
                      className={cx(outcome?.status === "granted" && "border-ink")}
                    >
                      {outcome?.status === "granted" && <Icon name="check" className="size-3.5" />}
                      {busy === g.id ? "waiting for you…" : g.label}
                      {!outcome && g.warn && (
                        <span className="text-xs text-ink-faint">intrusive</span>
                      )}
                      {outcome?.status === "denied" && (
                        <span className="text-xs text-ink-faint">declined</span>
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>

            {Object.keys(outcomes).length > 0 && (
              <div className="mt-6 space-y-4">
                {GATED.filter((g) => outcomes[g.id]).map((g) => {
                  const { status, section } = outcomes[g.id];
                  const wanted = HIGHLIGHT[g.id] ?? [];
                  const rows = (
                    wanted.length
                      ? section.rows.filter((r) => wanted.some((w) => r.k.includes(w)))
                      : []
                  );
                  const shown = rows.length
                    ? rows
                    : section.rows
                        .filter((r) => r.v !== undefined && !String(r.v).startsWith("error:"))
                        .slice(0, 4);
                  return (
                    <Card key={g.id} tone="raised" className="p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <h3 className="text-base font-semibold tracking-tight">{g.label}</h3>
                        <span className="text-sm text-ink-faint">
                          {status === "granted" ? "you approved this" : "you declined"}
                        </span>
                      </div>
                      {status === "denied" ? (
                        <p className="mt-1.5 max-w-[70ch] text-sm leading-relaxed text-ink-muted">
                          Nothing was read. The browser refused, so this page learned
                          only that you said no — which is itself a detail most sites record.
                        </p>
                      ) : (
                        <>
                          <p className="mt-1.5 max-w-[70ch] text-sm leading-relaxed text-ink-muted">
                            One approval handed over {g.reveals}.
                          </p>
                          <Table cols={["40%", "auto"]} className="mt-3">
                            <tbody>
                              {shown.map((r) => (
                                <tr key={r.k} className="align-top">
                                  <Td className="text-sm text-ink-muted">{r.k}</Td>
                                  <Td mono className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                                    {looksLikeJson(r.v) ? (
                                      <Json value={typeof r.v === "string" ? JSON.parse(r.v) : r.v} dense />
                                    ) : (
                                      String(r.v)
                                    )}
                                  </Td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </>
                      )}
                      <a
                        href={`#${section.id}`}
                        className="mt-3 inline-block text-sm text-ink-muted no-underline hover:text-ink hover:underline"
                      >
                        Everything it returned →
                      </a>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* raw data */}
          <section>
            <div className="mb-10">
              <h2 className="text-xl font-semibold tracking-tight">Every detail, as collected</h2>
              <p className="mt-1 max-w-[72ch] text-sm leading-relaxed text-ink-muted">
                The findings above are derived from these {all.length} tables.
                Field names carry a definition where one helps; anything your
                browser withheld is grayed out.
              </p>
              <div className="mt-3">
                <Checkbox checked={hideEmpty} onChange={setHideEmpty}>
                  Hide the {fieldCount - reported} fields that were not reported
                </Checkbox>
              </div>
            </div>

            {CATEGORIES.map((c) => {
              const present = all.filter((s) => s.group === c.title);
              const isIdentity = c.id === "identity";
              if (!present.length && !isIdentity) return null;
              return (
                <div key={c.id} id={`cat-${c.id}`} className="mb-16">
                  <div className="mb-2 border-b border-ink pb-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                      <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                        <Icon name={c.icon} className="size-4 text-ink-muted" />
                        {c.title}
                      </h3>
                      <a
                        href={`/methods#${METHODS_GROUP[c.id] ?? ""}`}
                        className="text-sm text-ink-muted no-underline hover:text-ink hover:underline"
                      >
                        How these work →
                      </a>
                    </div>
                    <p className="mt-1.5 max-w-[74ch] text-sm leading-relaxed text-ink-muted">
                      {c.blurb}
                    </p>
                  </div>

                  {c.subgroups.map((sg) => {
                    const inSub = present.filter((s) => s.subgroup === sg.title);
                    const hasTrackers = sg.ids.includes("trackers");
                    const hasFrame = sg.ids.includes("third-party");
                    if (!inSub.length && !hasTrackers && !hasFrame) return null;
                    return (
                      <div key={sg.title} className="mt-10 first:mt-0">
                        <RuleHeading className="mb-5">{sg.title}</RuleHeading>
                        {inSub.map((s) => (
                          <SectionBlock key={s.id} section={s} hideEmpty={hideEmpty} />
                        ))}
                        {hasFrame && <ThirdParty onResult={addSection} />}
                        {hasTrackers && <TrackerPayloads sections={all} />}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </section>
        </div>
      </div>
    </>
  );
}
