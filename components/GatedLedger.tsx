"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Finding } from "@/lib/findings";
import type { GatedOutcome, Section } from "@/lib/types";
import {
  CAPABILITIES,
  METHOD_SLUG,
  RESTING_CAPTION,
  type GatedCapability,
  type RestingState,
  getter,
  restingState,
} from "@/lib/gated";
import { useClientValue } from "@/lib/use-client-value";
import { FindingArticle } from "./Findings";
import { Icon } from "./Icon";
import { Button, cx } from "./ui";

/**
 * Where a row is in the transaction.
 *
 * `prompting` and `working` are deliberately separate. Between them sits the
 * moment you answer the browser, and a control that reads "waiting for you"
 * while the operating system hunts for a satellite is describing the wrong
 * party.
 */
type Phase =
  | { at: "rest" }
  | { at: "confirming" }
  | { at: "prompting" }
  | { at: "working" }
  | { at: "done"; outcome: GatedOutcome; reason?: string };

const REST: Phase = { at: "rest" };

/**
 * Watch a permission until its state moves off `prompt`.
 *
 * This is how the row knows the prompt has been answered: there is no event
 * for "the dialog closed", but the permission itself changes the instant you
 * decide. Resolves to nothing if the browser cannot be asked.
 */
function whenAnswered(names: string[], onAnswer: () => void): () => void {
  const statuses: { status: PermissionStatus; handler: () => void }[] = [];
  let cancelled = false;

  for (const name of names) {
    navigator.permissions
      ?.query({ name } as unknown as PermissionDescriptor)
      .then((status) => {
        if (cancelled) return;
        const handler = () => {
          if (status.state !== "prompt") onAnswer();
        };
        status.addEventListener("change", handler);
        statuses.push({ status, handler });
      })
      .catch(() => {
        /* this browser does not know the name; the phase just stays put */
      });
  }

  return () => {
    cancelled = true;
    for (const { status, handler } of statuses) status.removeEventListener("change", handler);
  };
}

/* ── the copy for each ending ────────────────────────────────── */

function ending(cap: GatedCapability, outcome: GatedOutcome, reason?: string) {
  switch (outcome) {
    case "denied":
      return {
        headline: "You said no, and nothing was read.",
        body: "This page learned one thing anyway: that you refused. That is a detail in its own right, readable from now on without another prompt, and most sites record it.",
      };
    case "unsupported":
      return {
        headline: "Your browser will not do this at all.",
        body:
          reason ??
          `${cap.name} is not implemented here, so there was never a prompt to answer.`,
      };
    case "error":
      return {
        headline: "The attempt failed.",
        body: reason ?? "Something went wrong before any data came back. You refused nothing.",
      };
    default:
      return null;
  }
}

/* ── one row ─────────────────────────────────────────────────── */

function Row({
  cap,
  phase,
  resting,
  contrast,
  finding,
  disabled,
  onAsk,
  onConfirm,
  onCancel,
}: {
  cap: GatedCapability;
  phase: Phase;
  resting: RestingState;
  contrast: ReturnType<GatedCapability["contrast"]>;
  finding?: Finding;
  disabled: boolean;
  onAsk: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const busy = phase.at === "prompting" || phase.at === "working";
  const granted = phase.at === "done" && phase.outcome === "granted";
  const blocked = resting === "blocked" && phase.at === "rest";
  const missing = resting === "unsupported" && phase.at === "rest";

  const caption =
    phase.at === "prompting"
      ? "waiting for your answer"
      : phase.at === "working"
        ? cap.working.replace(/…$/, "").toLowerCase() + "…"
        : phase.at === "done"
          ? { granted: "allowed", denied: "declined", unsupported: "not available", error: "failed" }[
              phase.outcome
            ]
          : RESTING_CAPTION[resting];

  const action =
    phase.at === "done"
      ? phase.outcome === "granted"
        ? null
        : "Try again"
      : resting === "granted"
        ? "Use it"
        : "Ask";

  const slug = METHOD_SLUG[cap.id];

  return (
    <li className="border-t border-rule py-body first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-group gap-y-tight">
        <h4 className="text-base font-medium tracking-tight">{cap.name}</h4>
        <div className="flex items-center gap-snug">
          <span
            className={cx("text-xs", granted ? "text-ink-muted" : "text-ink-faint")}
            aria-live="polite"
          >
            {caption}
          </span>
          {action && (
            <Button
              onClick={onAsk}
              disabled={disabled || busy || blocked || missing}
              title={
                blocked
                  ? "Blocked in your browser settings"
                  : missing
                    ? "This browser does not implement it"
                    : undefined
              }
            >
              {busy && (
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-ink-faint motion-safe:animate-pulse"
                />
              )}
              {action}
            </Button>
          )}
          {granted && <Icon name="check" className="size-4 text-ink-muted" />}
        </div>
      </div>

      <p className="mt-tight max-w-text text-sm text-ink-muted">
        {cap.reveals}
        {slug && (
          <>
            {" "}
            <a
              href={`/methods#${slug}`}
              className="whitespace-nowrap text-ink-faint no-underline hover:text-ink hover:underline"
            >
              How it works&nbsp;→
            </a>
          </>
        )}
      </p>

      {/* At rest, the half of the contrast that already exists. */}
      {phase.at === "rest" && (
        <p className="mt-snug max-w-text text-sm text-ink-faint">
          {contrast.before
            ? `Known already, without asking: ${contrast.before}`
            : "Nothing on this page could work this out without asking."}
        </p>
      )}

      {missing && (
        <p className="mt-snug max-w-text text-sm text-ink-faint">
          This browser has not implemented it, so there is no prompt to show. A
          capability one browser ships and another refuses is itself a thing a
          site can measure about you.
        </p>
      )}

      {blocked && (
        <p className="mt-snug max-w-text text-sm text-ink-faint">
          You blocked this here before, so no prompt will appear — and this page can
          read that you blocked it without showing one.
        </p>
      )}

      {/* The intrusive probe confirms in the page's own voice, and names every
          scheme it intends to try before you agree to any of them. */}
      {phase.at === "confirming" && cap.intrusive && (
        <div className="mt-snug max-w-text border-l border-rule pl-4 motion-safe:animate-[rise-in_160ms_ease-out]">
          <p className="text-sm">{cap.intrusive.warning}</p>
          <p className="mt-snug font-mono text-sm break-words text-ink-muted">
            {cap.intrusive.schemes.join("  ")}
          </p>
          <div className="mt-snug flex flex-wrap gap-tight">
            <Button onClick={onConfirm}>Run it anyway</Button>
            <Button variant="quiet" onClick={onCancel}>
              Leave it alone
            </Button>
          </div>
        </div>
      )}

      {/* Once granted the row keeps its place and opens underneath: the whole
          point is the distance between the two lines, and sending someone
          4,000 pixels down the page to find the second one loses it. */}
      {granted && (
        <div className="mt-body motion-safe:animate-[rise-in_200ms_ease-out]">
          <div className="max-w-text border-l border-ink pl-4">
            <dl className="grid gap-x-group gap-y-hair sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
              <dt className="text-sm text-ink-faint">Guessed before</dt>
              <dd className="text-sm text-ink-muted">
                {contrast.before ?? "Nothing. There is no passive equivalent of this."}
              </dd>
              <dt className="mt-hair text-sm text-ink-faint sm:mt-0">Known now</dt>
              <dd className="text-sm">{contrast.after ?? "—"}</dd>
            </dl>
            {contrast.note && (
              <p className="mt-snug text-sm text-ink-muted">{contrast.note}</p>
            )}
          </div>
          {finding && (
            <div className="mt-body">
              <FindingArticle finding={finding} compact />
            </div>
          )}
        </div>
      )}

      {phase.at === "done" && phase.outcome !== "granted" && (
        <div className="mt-body max-w-text border-l border-rule pl-4 motion-safe:animate-[rise-in_200ms_ease-out]">
          {(() => {
            const e = ending(cap, phase.outcome, phase.reason)!;
            return (
              <>
                <p className="text-lg font-medium tracking-tight">{e.headline}</p>
                <p className="mt-tight text-sm text-ink-muted">{e.body}</p>
              </>
            );
          })()}
        </div>
      )}
    </li>
  );
}

/* ── the ledger ──────────────────────────────────────────────── */

export function GatedLedger({
  sections,
  findings,
  onResult,
}: {
  /** everything collected so far — read for the contrast and for permission state */
  sections: Section[];
  /** the findings derived from what has been granted */
  findings: Finding[];
  onResult: (section: Section) => void;
}) {
  const [phases, setPhases] = useState<Record<string, Phase>>({});
  const unwatch = useRef<Record<string, () => void>>({});

  const get = useMemo(() => getter(sections), [sections]);

  // Support has to be read from `window`, so it cannot be known while
  // rendering on the server. `useClientValue` swaps the answer in during
  // hydration rather than branching mid-render.
  const supported = useClientValue(
    () => CAPABILITIES.map((c) => c.supported()).join(","),
    CAPABILITIES.map(() => "true").join(",")
  );
  const supports = useMemo(() => {
    const flags = supported.split(",");
    return Object.fromEntries(CAPABILITIES.map((c, i) => [c.id, flags[i] === "true"]));
  }, [supported]);
  const phaseOf = (id: string) => phases[id] ?? REST;
  const setPhase = (id: string, p: Phase) => setPhases((prev) => ({ ...prev, [id]: p }));

  const run = useCallback(
    async (cap: GatedCapability) => {
      // Already allowed means no dialog will appear, so claiming to wait for
      // an answer would be a lie the reader can check.
      const willPrompt =
        restingState(cap, get, supports[cap.id]) !== "granted" && cap.permissions.length > 0;
      setPhase(cap.id, willPrompt ? { at: "prompting" } : { at: "working" });

      if (willPrompt) {
        unwatch.current[cap.id] = whenAnswered(cap.permissions, () =>
          setPhases((prev) =>
            prev[cap.id]?.at === "prompting" ? { ...prev, [cap.id]: { at: "working" } } : prev
          )
        );
      }

      try {
        const { section, outcome, reason } = await cap.run();
        // Only a granted probe has anything to show. A refusal used to add a
        // table of its own error message, under a heading that said the
        // opposite of what had happened; the row here reports the outcome.
        if (outcome === "granted") onResult(section);
        setPhase(cap.id, { at: "done", outcome, reason });
      } catch (e) {
        setPhase(cap.id, { at: "done", outcome: "error", reason: (e as Error).message });
      } finally {
        unwatch.current[cap.id]?.();
        delete unwatch.current[cap.id];
      }
    },
    [get, onResult, supports]
  );

  const ask = (cap: GatedCapability) => {
    if (cap.intrusive && phaseOf(cap.id).at !== "confirming") {
      setPhase(cap.id, { at: "confirming" });
      return;
    }
    void run(cap);
  };

  const ordinary = CAPABILITIES.filter((c) => !c.intrusive);
  const intrusive = CAPABILITIES.filter((c) => c.intrusive);

  const grantedCount = CAPABILITIES.filter(
    (c) => phaseOf(c.id).at === "done" && (phaseOf(c.id) as { outcome: string }).outcome === "granted"
  ).length;
  const grantedFields = CAPABILITIES.reduce((n, c) => {
    const s = sections.find((x) => x.id === c.id);
    const p = phaseOf(c.id);
    return p.at === "done" && p.outcome === "granted" ? n + (s?.rows.length ?? 0) : n;
  }, 0);

  // One probe at a time: the browser will only show one prompt anyway, and two
  // pending dialogs make it impossible to tell which one you answered.
  const anyBusy = CAPABILITIES.some((c) => ["prompting", "working"].includes(phaseOf(c.id).at));

  const renderRow = (cap: GatedCapability) => (
    <Row
      key={cap.id}
      cap={cap}
      phase={phaseOf(cap.id)}
      resting={restingState(cap, get, supports[cap.id])}
      contrast={cap.contrast(get)}
      finding={findings.find((f) => f.sectionId === cap.id)}
      disabled={anyBusy && !["prompting", "working"].includes(phaseOf(cap.id).at)}
      onAsk={() => ask(cap)}
      onConfirm={() => void run(cap)}
      onCancel={() => setPhase(cap.id, REST)}
    />
  );

  return (
    <div>
      <ul>{ordinary.map(renderRow)}</ul>

      <div className="mt-group border-t border-ink pt-body">
        <p className="mb-body max-w-text text-sm text-ink-muted">
          The rest of this page reads your browser. This one reaches past it.
        </p>
        <ul>{intrusive.map(renderRow)}</ul>
      </div>

      <div className="mt-group border-t border-rule pt-body">
        <h3 className="text-base font-medium">Granting outlives this tab.</h3>
        <p className="mt-tight max-w-text text-sm text-ink-muted">
          {grantedCount === 0
            ? "Nothing has been granted here."
            : `You have allowed ${grantedCount} of ${CAPABILITIES.length}, which added ${grantedFields.toLocaleString()} fields to the tables below.`}{" "}
          A permission you approve is remembered for this site, and this page cannot
          hand it back: <code className="code">permissions.revoke()</code>{" "}
          was removed from browsers years ago and never replaced. Only your browser can
          undo it — the icon at the left of the address bar, then site settings. The same
          is true of every other site you have ever said yes to.
        </p>
      </div>
    </div>
  );
}
