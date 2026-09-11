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
import { Badge, Button, Card, Label, Switch, cx } from "./ui";

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
  const [view, setView] = useState<"findings" | "everything">("findings");
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

  // The interaction counters are live, so re-read them on a slow interval.
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  // Evidence links point into the raw tables, which may be filtered out of the
  // current view — switch to them first, then jump.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement)?.closest?.("a");
      const href = link?.getAttribute("href");
      if (!href?.startsWith("#") || href === "#plain") return;
      setView("everything");
      requestAnimationFrame(() => {
        document.getElementById(href.slice(1))?.scrollIntoView({ block: "start" });
      });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
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
    void tick; // re-materialise live rows on each tick
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

  return (
    <>
      <CssProbe probeKey={probeKey} onResult={addSection} />

      {/* sticky command bar */}
      <div className="sticky top-0 z-40 -mx-4 mb-8 border-b border-rule bg-paper/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-page flex-wrap items-center gap-x-6 gap-y-2">
          <span className="text-sm font-semibold tracking-tight">Session Context</span>
          <span className="text-sm text-ink-muted tabular">
            {findings.length} findings · {reported} details · {all.length} sections
            {elapsed > 0 && ` · ${elapsed.toFixed(0)} ms`}
          </span>
          <div className="flex rounded-sm border border-rule-strong">
            {(["findings", "everything"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cx(
                  "px-2.5 py-1 text-sm transition-colors first:border-r first:border-rule-strong",
                  view === v ? "bg-ink text-paper" : "text-ink-muted hover:bg-sunken"
                )}
              >
                {v === "findings" ? "Findings" : "Everything"}
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button onClick={() => void collect()} disabled={busy !== null}>
              <Icon name="refresh" className="size-3.5" />
              {busy === "collect" ? "Collecting…" : "Re-collect"}
            </Button>
            <Button onClick={copyJSON} disabled={!sections.length}>
              <Icon name="copy" className="size-3.5" />
              Copy JSON
            </Button>
            <Button onClick={downloadJSON} disabled={!sections.length}>
              <Icon name="download" className="size-3.5" />
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* permission shelf */}
      <Card tone="raised" className="mb-8 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Icon name="key" className="size-4 text-ink-muted" />
          <span className="text-sm font-medium">Everything above this line needed no permission.</span>
          <span className="text-sm text-ink-muted">
            These require your explicit approval — nothing runs until you press one:
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {GATED.map((g) => (
            <Button key={g.id} onClick={() => void runGated(g)} disabled={busy !== null}>
              {busy === g.id ? "waiting…" : g.label}
              {g.warn && <Badge tone="quiet">intrusive</Badge>}
            </Button>
          ))}
        </div>
      </Card>

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        {/* contents rail */}
        <nav className="mb-8 lg:sticky lg:top-16 lg:mb-0 lg:self-start">
          <Label className="mb-2">Contents</Label>
          <ul className="space-y-3 text-sm">
            <li>
              <a href="#plain" className="font-medium no-underline hover:underline">
                In plain English
              </a>
            </li>
            {view === "everything" &&
              CATEGORIES.map((c) => {
              const present = all.filter((s) => s.group === c.title);
              if (!present.length) return null;
              return (
                <li key={c.id}>
                  <a
                    href={`#cat-${c.id}`}
                    className="flex items-start gap-1.5 font-medium no-underline hover:underline"
                  >
                    <Icon name={c.icon} className="mt-0.5 size-3.5 shrink-0 text-ink-faint" />
                    {c.title}
                  </a>
                  <span className="ml-5 text-xs text-ink-faint tabular">
                    {present.length} tables
                  </span>
                </li>
              );
            })}
            {view === "findings" && (
              <li className="text-sm text-ink-faint">
                Switch to “Everything” for the {all.length} raw tables.
              </li>
            )}
          </ul>
        </nav>

        <div className="min-w-0">
          <section id="plain" className="mb-12">
            <h2 className="mb-1 text-2xl font-semibold tracking-tight">In plain English</h2>
            <p className="mb-6 max-w-[74ch] text-sm leading-relaxed text-ink-muted">
              What this page worked out about you, in the order it matters. Each
              card expands to the exact values behind it.
            </p>
            <Findings findings={findings} groups={FINDING_GROUPS} />
          </section>

          <section className="mb-12">
            <h2 className="mb-1 text-2xl font-semibold tracking-tight">Try it yourself</h2>
            <p className="mb-4 max-w-[74ch] text-sm leading-relaxed text-ink-muted">
              One demonstration needs your participation.
            </p>
            <TypingBiometrics onResult={addSection} />
          </section>

          <section hidden={view === "findings"}>
            <div className="mb-4 border-t-2 border-ink pt-3">
              <h2 className="text-2xl font-semibold tracking-tight">Every detail, as collected</h2>
              <p className="mt-1 max-w-[74ch] text-sm leading-relaxed text-ink-muted">
                The summary above is derived from these tables. Field names carry
                a definition where one helps; anything your browser withheld is
                greyed out.
              </p>
              <div className="mt-3">
                <Switch checked={hideEmpty} onChange={setHideEmpty}>
                  Hide the {fieldCount - reported} fields that were not reported
                </Switch>
              </div>
            </div>

            {CATEGORIES.map((c) => {
              const present = all.filter((s) => s.group === c.title);
              const isIdentity = c.id === "identity";
              if (!present.length && !isIdentity) return null;
              return (
                <div key={c.id} id={`cat-${c.id}`} className="mb-14">
                  <h3 className="flex items-center gap-2 border-b-2 border-ink pb-2 text-xl font-semibold tracking-tight">
                    <Icon name={c.icon} className="size-4 text-ink-muted" />
                    {c.title}
                  </h3>
                  <p className="mt-2 mb-6 max-w-[76ch] text-sm leading-relaxed text-ink-muted">
                    {c.blurb}
                  </p>

                  {c.subgroups.map((sg) => {
                    const inSub = present.filter((s) => s.subgroup === sg.title);
                    const hasTrackers = sg.ids.includes("trackers");
                    const hasFrame = sg.ids.includes("third-party");
                    if (!inSub.length && !hasTrackers && !hasFrame) return null;
                    return (
                      <div key={sg.title} className="mb-8">
                        <h4 className={cx("mb-4 text-base font-medium text-ink-muted")}>
                          {sg.title}
                        </h4>
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
