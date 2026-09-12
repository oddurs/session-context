"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Section } from "@/lib/types";
import {
  collectAll,
  liveInteractionRows,
  probeDeviceLabels,
  probeGeolocation,
  probeLocalFonts,
  sortSections,
} from "@/lib/collect";
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
import { Findings } from "./Findings";
import { CssProbe } from "./CssProbe";
import { ThirdParty } from "./ThirdParty";
import { TrackerPayloads } from "./TrackerPayloads";
import { TypingBiometrics } from "./TypingBiometrics";
import { Icon } from "./Icon";
import { Button, Checkbox, cx } from "./ui";

type Gated = { id: string; label: string; warn?: string; run: () => Promise<Section> };

const GATED: Gated[] = [
  { id: "geolocation", label: "Precise location", run: probeGeolocation },
  { id: "local-fonts", label: "Installed fonts", run: probeLocalFonts },
  { id: "device-labels", label: "Camera + microphone", run: probeDeviceLabels },
  { id: "screen-details", label: "All displays", run: probeScreenDetails },
  { id: "clipboard", label: "Clipboard contents", run: probeClipboard },
  { id: "idle", label: "Idle / lock state", run: probeIdle },
  { id: "sensors", label: "Motion sensors", run: probeSensors },
  {
    id: "schemes",
    label: "Installed desktop apps",
    warn:
      "This probe asks your browser to open the private URL of a dozen desktop applications (Slack, Zoom, Spotify, Discord and others) and watches which ones respond. Some of them may actually launch. Continue?",
    run: probeSchemes,
  },
];

/**
 * Tracks the section currently under the top of the viewport, the way
 * documentation sidebars do: whichever heading you have most recently passed.
 */
function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState("");

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = ids[0] ?? "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        // 96px down from the top: just below the sticky bar.
        if (el.getBoundingClientRect().top <= 96) current = id;
        else break;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
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
  const [collectedAt, setCollectedAt] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [hideEmpty, setHideEmpty] = useState(false);
  const [tick, setTick] = useState(0);

  const collect = useCallback(async () => {
    setBusy("collect");
    const t0 = performance.now();
    const s = await collectAll();
    setElapsed(performance.now() - t0);
    setSections(s);
    setCollectedAt(new Date().toLocaleTimeString());
    setBusy(null);
  }, []);

  useEffect(() => {
    // Collection is the page's whole purpose; it starts as soon as we mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void collect();
  }, [collect]);

  // The interaction counters keep running, so re-read them on a slow interval.
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const addSection = useCallback((s: Section) => {
    setExtra((prev) => sortSections([...prev.filter((p) => p.id !== s.id), s]));
  }, []);

  const runGated = async (g: Gated) => {
    if (g.warn && !window.confirm(g.warn)) return;
    setBusy(g.id);
    try {
      addSection(await g.run());
    } finally {
      setBusy(null);
    }
  };

  const all = useMemo(() => {
    void tick; // re-materialise the live rows on each tick
    const merged = sortSections([...serverSections, ...sections, ...extra]);
    return merged.map((s) =>
      s.id === "interaction" ? { ...s, rows: liveInteractionRows() } : s
    );
  }, [serverSections, sections, extra, tick]);

  const findings = useMemo(() => deriveFindings(all), [all]);
  const fieldCount = all.reduce((n, s) => n + s.rows.length, 0);
  const reported = all.reduce(
    (n, s) => n + s.rows.filter((r) => !isUnreported(r.v)).length,
    0
  );

  // Every anchor in reading order: the findings, then each category and the
  // tables inside it.
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
      <dl className="grid grid-cols-2 gap-x-8 gap-y-4 border-b border-rule py-4 sm:grid-cols-3 lg:grid-cols-6">
        {dateline.map((d) => (
          <div key={d.label}>
            <dt className="label">{d.label}</dt>
            <dd className="mt-0.5 text-base tabular">{d.value}</dd>
          </div>
        ))}
      </dl>

      {/* sticky bar: where you are, and what you can do about it */}
      <div className="sticky top-0 z-40 -mx-4 mb-10 border-b border-rule bg-paper/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-page items-center gap-4">
          <span className="truncate text-sm text-ink-muted">
            {activeId === "plain" || !activeId
              ? "In plain English"
              : [
                  CATEGORIES.find((c) => c.id === activeCategory)?.title,
                  all.find((s) => s.id === activeId)?.title,
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
          </span>
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
        <nav className="mb-10 lg:sticky lg:top-14 lg:mb-0 lg:self-start">
          <div className="label mb-2 border-b border-rule pb-1.5">Contents</div>
          <ul className="space-y-1 text-sm">
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
        </nav>

        <div className="min-w-0">
          {/* plain English */}
          <section id="plain" className="mb-14">
            <h2 className="text-xl font-semibold tracking-tight">In plain English</h2>
            <p className="mt-1 mb-8 max-w-[72ch] text-sm leading-relaxed text-ink-muted">
              What this page worked out about you, in the order it matters. Every
              statement expands to the exact values it came from.
            </p>
            <Findings findings={findings} groups={FINDING_GROUPS} />

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
            <div className="flex flex-wrap gap-2">
              {GATED.map((g) => (
                <Button key={g.id} onClick={() => void runGated(g)} disabled={busy !== null}>
                  {busy === g.id ? "waiting…" : g.label}
                  {g.warn && <span className="text-xs text-ink-faint">intrusive</span>}
                </Button>
              ))}
            </div>
          </section>

          {/* raw data */}
          <section>
            <div className="mb-10">
              <h2 className="text-xl font-semibold tracking-tight">Every detail, as collected</h2>
              <p className="mt-1 max-w-[72ch] text-sm leading-relaxed text-ink-muted">
                The findings above are derived from these {all.length} tables.
                Field names carry a definition where one helps; anything your
                browser withheld is greyed out.
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
                  <div className="mb-8 border-b border-ink pb-2">
                    <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                      <Icon name={c.icon} className="size-4 text-ink-muted" />
                      {c.title}
                    </h3>
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
                      <div key={sg.title} className="mb-10">
                        <h4 className="label mb-5">{sg.title}</h4>
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
