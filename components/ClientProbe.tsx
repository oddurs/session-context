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
  sortSections,
} from "@/lib/collect";
import { applyLive, watchLive } from "@/lib/live";
import { loadNotes, scheduleNotesLoad } from "@/lib/notes";
import { useMediaQuery } from "@/lib/use-client-value";
import { useScrollSpy } from "@/lib/use-scroll-spy";
import { useAnchorScroll } from "@/lib/use-anchor-scroll";
import { FINDING_GROUPS, GRANTED_GROUP, deriveFindings } from "@/lib/findings";
import { CATEGORIES } from "@/lib/taxonomy";
import { SectionBlock, isUnreported } from "./DataTable";
import { Findings } from "./Findings";
import { Identifiability } from "./Identifiability";
import { CollectionLog, CollectionReceipt } from "./CollectionLog";
import { GatedLedger } from "./GatedLedger";
import { CssProbe } from "./CssProbe";
import { ThirdParty } from "./ThirdParty";
import { TrackerPayloads } from "./TrackerPayloads";
import { TypingBiometrics } from "./TypingBiometrics";
import { EraseButton } from "./EraseButton";
import { Icon } from "./Icon";
import { Button, Checkbox, Menu, MenuItem, RuleHeading, cx } from "./ui";
import { StickyBar } from "./StickyBar";

/**
 * One entry in the contents rail.
 *
 * There used to be three near-copies of this — top-level, category,
 * subsection — and they had already drifted: inactive subsections drew a
 * hairline where the others drew nothing. Depth is the only thing that
 * actually varies.
 */
function RailLink({
  href,
  active,
  depth = 0,
  count,
  children,
}: {
  href: string;
  active: boolean;
  /** 0 a part of the document, 1 a category of data, 2 one table */
  depth?: 0 | 1 | 2;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-current={active ? "location" : undefined}
      className={cx(
        "flex items-baseline gap-tight border-l py-hair no-underline transition-colors hover:text-ink",
        depth === 0 ? "pl-3" : depth === 1 ? "pl-6" : "pl-9",
        active
          ? "border-ink text-ink"
          : // The nested levels keep a hairline so a run of them reads as one
            // list rather than as loose entries.
            depth === 0
            ? "border-transparent text-ink-muted"
            : "border-rule text-ink-muted",
        active && depth < 2 && "font-medium"
      )}
    >
      <span className="flex-1">{children}</span>
      {count !== undefined && (
        <span className="text-xs text-ink-faint tabular">{count}</span>
      )}
    </a>
  );
}

/** Raw-data category → the matching group on the methods page. */
const METHODS_GROUP: Record<string, string> = {
  server: "passive",
  identity: "fingerprint",
  browser: "environment",
  device: "environment",
  session: "environment",
  granted: "gated",
};

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
  const [collectedAt, setCollectedAt] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [hideEmpty, setHideEmpty] = useState(false);
  const [showDefinitions, setShowDefinitions] = useState(false);
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
      // Replace rather than append: a second collection — a re-collect, or
      // StrictMode running the effect twice in development — would otherwise
      // add a duplicate of every deferred section.
      void collectDeferred().then((extra) =>
        setSections((prev) =>
          sortSections([...prev.filter((s) => !extra.some((e) => e.id === s.id)), ...extra])
        )
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
  const visitorId = String(
    all
      .find((s) => s.id === "persistence")
      ?.rows.find((r) => r.k === "assigned identifier")?.v ?? ""
  ) || undefined;
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
    const ids = ["plain", "identifiability", "gated", "record"];
    for (const c of CATEGORIES) {
      const present = all.filter((s) => s.group === c.title);
      if (!present.length) continue;
      ids.push(`cat-${c.id}`, ...present.map((s) => s.id));
    }
    ids.push("erase");
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

  const copied = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [justCopied, setJustCopied] = useState(false);
  const copyJSON = () => {
    void navigator.clipboard.writeText(JSON.stringify(asJSON(), null, 2)).then(() => {
      setJustCopied(true);
      if (copied.current) clearTimeout(copied.current);
      copied.current = setTimeout(() => setJustCopied(false), 1800);
    });
  };
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
    { label: "Fields reported", value: reported.toLocaleString() },
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
      <dl className="grid grid-cols-2 gap-y-body border-b border-rule py-body sm:grid-cols-3 lg:grid-cols-6">
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
            <dd className="mt-hair truncate text-lg font-medium leading-none tracking-[-0.01em] tabular">
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
              : activeId === "gated"
                ? "What a prompt unlocks"
                : activeId === "identifiability"
                  ? "How identifying this is"
                  : activeId === "erase"
                    ? "Take it back"
                    : activeId === "record"
                      ? "Every detail, as collected"
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
        <Menu label={justCopied ? "Copied" : "Export"}>
          <MenuItem onSelect={copyJSON} hint="clipboard">
            Copy everything as JSON
          </MenuItem>
          <MenuItem onSelect={downloadJSON} hint=".json">
            Download the whole record
          </MenuItem>
        </Menu>
      </StickyBar>

      <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-section">
        {/* contents rail */}
        <nav
          aria-label="Contents"
          className={cx("lg:sticky lg:top-14 lg:self-start", revealed && "mb-group lg:mb-0")}
        >
          {/* Collapsed on small screens: a full index above the content pushes
              the page itself off the first screen. */}
          {revealed && (
          <details ref={toc} className="group/toc">
            <summary className="label flex cursor-pointer list-none items-center justify-between border-b border-rule pb-tight lg:pointer-events-none">
              Contents
              <span className="text-ink-faint lg:hidden">
                {all.length} tables
              </span>
            </summary>
          <ul className="mt-snug space-y-hair text-sm">
            {[
              { id: "plain", label: "In plain English" },
              { id: "identifiability", label: "How identifying this is" },
              { id: "gated", label: "What a prompt unlocks" },
            ].map((item) => (
              <li key={item.id}>
                <RailLink href={`#${item.id}`} active={activeId === item.id}>
                  {item.label}
                </RailLink>
              </li>
            ))}

            {/* The five categories are not parts of the document in their own
                right; they are the contents of this one. Without it they read
                as peers of "In plain English", which is a level they are not. */}
            <li>
              <RailLink href="#record" active={activeId === "record"}>
                Every detail, as collected
              </RailLink>
              <ul>
                {CATEGORIES.map((c) => {
                  const present = all.filter((s) => s.group === c.title);
                  if (!present.length) return null;
                  const on = activeCategory === c.id;
                  return (
                    <li key={c.id}>
                      <RailLink
                        href={`#cat-${c.id}`}
                        active={on}
                        depth={1}
                        count={present.length}
                      >
                        {c.short}
                      </RailLink>
                      {on && (
                        <ul className="mb-hair">
                          {present.map((sec) => (
                            <li key={sec.id}>
                              <RailLink
                                href={`#${sec.id}`}
                                active={activeId === sec.id}
                                depth={2}
                              >
                                {sec.title}
                              </RailLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>

            <li>
              <RailLink href="#erase" active={activeId === "erase"}>
                Take it back
              </RailLink>
            </li>
          </ul>
          </details>
          )}
        </nav>

        <div className="min-w-0">
          {/* plain English */}
          <section id="plain" className="mb-major">
            <h2 className="text-xl font-semibold tracking-tight">In plain English</h2>
            <p className="mt-tight mb-body max-w-text text-sm text-ink-muted">
              What this page worked out about you, in the order it matters. Every
              statement expands to the exact values it came from.
            </p>
            {error ? (
              <div className="border border-rule bg-raised p-4">
                <p className="text-base font-medium">Collection failed.</p>
                <p className="mt-tight max-w-text font-mono text-sm text-ink-muted">{error}</p>
                <Button className="mt-snug" onClick={() => void collect()}>
                  Try again
                </Button>
              </div>
            ) : !revealed ? (
              <CollectionLog phases={phases} />
            ) : (
              <div className="motion-safe:animate-[fade-in_180ms_ease-out]">
                <CollectionReceipt phases={phases} />
                <Findings findings={passiveFindings} groups={passiveGroups} stagger />
              </div>
            )}

            <div className={cx("mt-group border-t border-rule pt-body", !revealed && "hidden")}>
              <h3 className="text-base font-medium">Try it yourself</h3>
              <p className="mt-tight mb-body max-w-text text-sm text-ink-muted">
                One measurement needs your participation. The result appears in
                place, below the box.
              </p>
              <TypingBiometrics onResult={addSection} />
            </div>
          </section>

          {/* The entropy figures are commentary on the passive signals above,
              so they belong between those and the permission boundary, whose
              whole claim is about what came before it. */}
          <div className={cx(!revealed && "hidden")}>
            <Identifiability />
          </div>

          {/* the boundary that actually matters */}
          <section
            id="gated"
            className={cx("mb-major border-y border-ink py-group", !revealed && "hidden")}
          >
            <h2 className="text-xl font-semibold tracking-tight">
              Everything above this point needed no permission.
            </h2>
            <p className="mt-tight mb-body max-w-text text-sm text-ink-muted">
              Not one prompt was shown, and nothing you did granted consent. These are
              the capabilities that do ask first. Each one says what it would reveal,
              and what this page has already worked out without it — press one to see
              the distance between those two.
            </p>
            <GatedLedger
              sections={all}
              findings={grantedFindings}
              onResult={addSection}
            />
          </section>

          {/* raw data */}
          <section id="record" className={cx(!revealed && "hidden")}>
            <div className="mb-group">
              <h2 className="text-xl font-semibold tracking-tight">Every detail, as collected</h2>
              <p className="mt-tight max-w-text text-sm text-ink-muted">
                The findings above are derived from these {all.length} tables.
                Field names carry a definition where one helps; anything your
                browser withheld is grayed out.
              </p>
              <div className="mt-body flex flex-wrap gap-x-group gap-y-tight">
                <Checkbox checked={hideEmpty} onChange={setHideEmpty}>
                  Hide the {fieldCount - reported} fields that were not reported
                </Checkbox>
                {/*
                  * The definitions are otherwise reachable only by pointer:
                  * making seven hundred field names focusable would bury every
                  * real control in the tab order, so the way to read them
                  * without a mouse is to print them.
                  */}
                <Checkbox checked={showDefinitions} onChange={setShowDefinitions}>
                  Print every field definition
                </Checkbox>
              </div>
            </div>

            {CATEGORIES.map((c) => {
              const present = all.filter((s) => s.group === c.title);
              const isIdentity = c.id === "identity";
              if (!present.length && !isIdentity) return null;
              return (
                <div key={c.id} id={`cat-${c.id}`} className="mb-major">
                  <div className="mb-body border-b border-ink pb-tight">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-group gap-y-hair">
                      <h3 className="flex items-center gap-tight text-xl font-semibold tracking-tight">
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
                    <p className="mt-tight max-w-text text-sm text-ink-muted">
                      {c.blurb}
                    </p>
                  </div>

                  {c.subgroups.map((sg) => {
                    const inSub = present.filter((s) => s.subgroup === sg.title);
                    const hasTrackers = sg.ids.includes("trackers");
                    const hasFrame = sg.ids.includes("third-party");
                    if (!inSub.length && !hasTrackers && !hasFrame) return null;
                    return (
                      <div key={sg.title} className="mt-group first:mt-0">
                        <RuleHeading className="mb-body">{sg.title}</RuleHeading>
                        {inSub.map((s) => (
                          <SectionBlock
                            key={s.id}
                            section={s}
                            hideEmpty={hideEmpty}
                            showDefinitions={showDefinitions}
                          />
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

          {/* Last, and deliberately: the offer to undo what was stored only
              means something once you have seen the eight places it is stored
              in. It also has to come after everything that stores anything. */}
          <div className={cx(!revealed && "hidden")}>
            <EraseButton identifier={visitorId} />
          </div>
        </div>
      </div>
    </>
  );
}
