"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Section } from "@/lib/types";
import type { Phase } from "@/lib/collect";
import {
  collectAll,
  collectDeferred,
  liveCheapSections,
  liveEventSections,
  liveSection,
  probeDeviceLabels,
  probeGeolocation,
  probeLocalFonts,
  sortSections,
} from "@/lib/collect";
import { applyLive, watchLive } from "@/lib/live";
import { loadNotes, scheduleNotesLoad } from "@/lib/notes";
import { useMediaQuery } from "@/lib/use-client-value";
import { useScrollSpy } from "@/lib/use-scroll-spy";
import { useAnchorScroll } from "@/lib/use-anchor-scroll";
import {
  probeClipboard,
  probeIdle,
  probeSchemes,
  probeScreenDetails,
  probeSensors,
} from "@/lib/advanced";
import { FINDING_GROUPS, GRANTED_GROUP, deriveFindings } from "@/lib/findings";
import { CATEGORIES } from "@/lib/taxonomy";
import { SectionBlock, isUnreported } from "./DataTable";
import { Findings } from "./Findings";
import { Identifiability } from "./Identifiability";
import { CollectionLog, CollectionReceipt } from "./CollectionLog";
import { CssProbe } from "./CssProbe";
import { ThirdParty } from "./ThirdParty";
import { TrackerPayloads } from "./TrackerPayloads";
import { TypingBiometrics } from "./TypingBiometrics";
import { EraseButton } from "./EraseButton";
import { Icon } from "./Icon";
import { Button, Checkbox, Menu, MenuItem, RuleHeading, cx } from "./ui";
import { StickyBar } from "./StickyBar";

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

export function ClientProbe({
  serverSections,
  probeKey,
  nonce,
}: {
  serverSections: Section[];
  probeKey: string;
  nonce?: string;
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
  const [phases, setPhases] = useState<Phase[]>([]);
  const [revealed, setRevealed] = useState(false);

  const collect = useCallback(async () => {
    setBusy("collect");
    setError(null);
    setPhases([]);
    setRevealed(false);
    const t0 = performance.now();

    // Only for pathological cases: the page normally resolves in about a
    // second and a half, so this should never fire.
    const guard = setTimeout(() => setRevealed(true), 10_000);

    try {
      const s = await collectAll((sections, phase) => {
        setSections(sections);
        setPhases((prev) => [...prev.filter((p) => p.id !== phase.id), phase]);
      });
      setSections(s);
      setElapsed(performance.now() - t0);
      setCollectedAt(new Date().toLocaleTimeString());
      setRevealed(true);

      // The processor measurements land afterwards, into a page that is
      // already readable.
      void collectDeferred().then((extra) =>
        setSections((prev) => sortSections([...prev, ...extra]))
      );
    } catch (e) {
      setError((e as Error).message);
      setRevealed(true);
    } finally {
      clearTimeout(guard);
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    // Collection is the page's whole purpose; it starts as soon as we mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void collect();
  }, [collect]);

  // Field definitions are fetched when the browser is idle, and immediately if
  // a pointer reaches the tables first.
  useEffect(() => {
    scheduleNotesLoad();
    const onHover = () => void loadNotes();
    document.addEventListener("pointerover", onHover, { once: true, passive: true });
    return () => document.removeEventListener("pointerover", onHover);
  }, []);

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
      if (kind === "cheap") merge([...liveCheapSections(), ...liveEventSections()]);
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
  // Findings about what you handed over belong beside the buttons that asked,
  // not in the list of what was taken without asking.
  const passiveFindings = useMemo(
    () => findings.filter((f) => f.group !== GRANTED_GROUP),
    [findings]
  );
  const grantedFindings = useMemo(
    () => findings.filter((f) => f.group === GRANTED_GROUP),
    [findings]
  );
  const passiveGroups = useMemo(
    () => FINDING_GROUPS.filter((g) => g !== GRANTED_GROUP),
    []
  );
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
  // The rail only mounts once findings are revealed, so this has to run again
  // at that point or it opens nothing.
  useEffect(() => {
    if (toc.current) toc.current.open = isWide;
  }, [isWide, revealed]);

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
  useAnchorScroll();

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
    {
      label: "Collected in",
      value: elapsed ? `${elapsed.toFixed(0)} ms` : phases.length ? `${Math.round(phases[phases.length - 1].at)} ms` : "—",
    },
    { label: "At", value: collectedAt || "—" },
  ];

  return (
    <>
      <CssProbe probeKey={probeKey} onResult={addSection} nonce={nonce} />

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

      {/* The bar is contextual at rest and takes over identity and navigation
          once the masthead has scrolled away. */}
      <StickyBar
        current="data"
        section={
          !revealed
            ? "Collecting…"
            : activeId === "plain" || !activeId
              ? "In plain English"
              : [
                  CATEGORIES.find((c) => c.id === activeCategory)?.title,
                  all.find((s) => s.id === activeId)?.title,
                ]
                  .filter(Boolean)
                  .join("  ·  ")
        }
      >
        <Button
          variant="quiet"
          onClick={() => void collect()}
          disabled={busy !== null}
          title={busy === "collect" ? "Collecting…" : "Collect everything again"}
          label="Collect everything again"
        >
          <Icon
            name="refresh"
            className={cx("size-3.5", busy === "collect" && "motion-safe:animate-spin")}
          />
        </Button>
        <Menu label="Export">
          <MenuItem onSelect={copyJSON} hint="clipboard">
            Copy everything as JSON
          </MenuItem>
          <MenuItem onSelect={downloadJSON} hint=".json">
            Download the whole record
          </MenuItem>
        </Menu>
      </StickyBar>

      <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        {/* contents rail */}
        <nav
          aria-label="Contents"
          className={cx("lg:sticky lg:top-14 lg:self-start", revealed && "mb-10 lg:mb-0")}
        >
          {/* Collapsed on small screens: a full index above the content pushes
              the page itself off the first screen. */}
          {revealed && (
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
          )}
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
            ) : !revealed ? (
              <CollectionLog phases={phases} />
            ) : (
              <div className="motion-safe:animate-[fade-in_180ms_ease-out]">
                <CollectionReceipt phases={phases} elapsed={elapsed} />
                <Findings findings={passiveFindings} groups={passiveGroups} />
                <Identifiability />
              </div>
            )}

            <div className={cx("mt-10 border-t border-rule pt-5", !revealed && "hidden")}>
              <h3 className="text-base font-medium">Try it yourself</h3>
              <p className="mt-1 mb-4 max-w-[72ch] text-sm leading-relaxed text-ink-muted">
                One measurement needs your participation. The result appears in
                place, below the box.
              </p>
              <TypingBiometrics onResult={addSection} />
              <EraseButton />
            </div>
          </section>

          {/* the boundary that actually matters */}
          <section className={cx("mb-14 border-y border-rule py-5", !revealed && "hidden")}>
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
              <div className="mt-8 border-t border-rule pt-6">
                {grantedFindings.length > 0 && (
                  <Findings findings={grantedFindings} groups={[GRANTED_GROUP]} />
                )}
                {GATED.filter((g) => outcomes[g.id]?.status === "denied").map((g) => (
                  <div key={g.id} className="border-t border-rule py-5 first:border-t-0">
                    <h4 className="text-lg font-medium leading-snug tracking-tight">
                      You declined {g.label.toLowerCase()}.
                    </h4>
                    <p className="mt-2 max-w-[72ch] text-sm leading-relaxed text-ink-muted">
                      Nothing was read. This page learned only that you said no, which is
                      itself a detail most sites record.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* raw data */}
          <section className={cx(!revealed && "hidden")}>
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
