"use client";

import { useMemo, useRef, useState } from "react";
import type { Section } from "@/lib/types";
import { mouseDynamics } from "@/lib/collect";
import { useClientValue } from "@/lib/use-client-value";
import { Badge, Button, Card, Table, Td, cx } from "./ui";

const PHRASE = "the quick brown fox jumps over the lazy dog";
const PROFILE_KEY = "dm_typing_profile";

type Profile = { dwell: number; flight: number; sdDwell: number; sdFlight: number; wpm: number };

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const sd = (a: number[]) => {
  const m = mean(a);
  return a.length ? Math.sqrt(mean(a.map((v) => (v - m) ** 2))) : 0;
};

/**
 * Keystroke dynamics: how long each key is held (dwell) and how long the gaps
 * between keys last (flight). The pattern is stable per person and is used
 * commercially for fraud scoring and continuous authentication.
 */
export function TypingBiometrics({ onResult }: { onResult: (s: Section) => void }) {
  const [typed, setTyped] = useState("");
  const [focused, setFocused] = useState(false);
  const [result, setResult] = useState<Section | null>(null);
  const [stats, setStats] = useState({ accuracy: 100, wpm: 0, keys: 0 });

  const input = useRef<HTMLInputElement>(null);
  const down = useRef<Map<string, number>>(new Map());
  const dwell = useRef<number[]>([]);
  const flight = useRef<number[]>([]);
  const lastUp = useRef<number | null>(null);
  const started = useRef<number | null>(null);

  const progress = useMemo(() => Math.min(typed.length / PHRASE.length, 1), [typed]);

  /** Words per minute so far, measured from the first keystroke. */
  const minutesElapsed = () =>
    started.current ? (performance.now() - started.current) / 60000 : 0;

  const reset = (keepProfile = true) => {
    setTyped("");
    setResult(null);
    down.current.clear();
    dwell.current = [];
    flight.current = [];
    lastUp.current = null;
    started.current = null;
    setStats({ accuracy: 100, wpm: 0, keys: 0 });
    if (!keepProfile) {
      try {
        localStorage.removeItem(PROFILE_KEY);
      } catch {
        /* storage blocked */
      }
    }
    input.current?.focus();
  };

  const analyze = () => {
    if (dwell.current.length < 8) return;
    const elapsedMin = minutesElapsed();
    const profile: Profile = {
      dwell: mean(dwell.current),
      flight: mean(flight.current),
      sdDwell: sd(dwell.current),
      sdFlight: sd(flight.current),
      wpm: elapsedMin > 0 ? typed.length / 5 / elapsedMin : 0,
    };

    let stored: Profile | null = null;
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      stored = raw ? (JSON.parse(raw) as Profile) : null;
    } catch {
      /* storage blocked */
    }

    // Normalized distance between this sample and the stored profile.
    const distance = stored
      ? Math.sqrt(
          ((profile.dwell - stored.dwell) / Math.max(stored.dwell, 1)) ** 2 +
            ((profile.flight - stored.flight) / Math.max(stored.flight, 1)) ** 2 +
            ((profile.sdFlight - stored.sdFlight) / Math.max(stored.sdFlight, 1)) ** 2
        )
      : null;

    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      /* storage blocked */
    }

    const md = mouseDynamics();
    const section: Section = {
      id: "typing",
      title: "Keystroke & Movement Biometrics",
      note:
        "Nothing here records what you typed, only how. Hold times and gaps between keys are consistent enough per person that banks and fraud systems use them to judge whether the same human is at the keyboard, and any page can read them without a prompt.",
      rows: [
        { k: "characters measured", v: dwell.current.length },
        { k: "accuracy", v: `${stats.accuracy}%` },
        { k: "mean key hold (dwell)", v: `${profile.dwell.toFixed(1)} ms` },
        { k: "hold consistency (σ)", v: `${profile.sdDwell.toFixed(1)} ms`, n: "lower is more machine-like" },
        { k: "mean gap between keys (flight)", v: `${profile.flight.toFixed(1)} ms` },
        { k: "gap consistency (σ)", v: `${profile.sdFlight.toFixed(1)} ms` },
        { k: "typing speed", v: `${profile.wpm.toFixed(0)} words per minute` },
        { k: "stored profile existed", v: !!stored, n: "from an earlier attempt in this browser" },
        { k: "distance from stored profile", v: distance != null ? distance.toFixed(3) : undefined },
        {
          k: "verdict",
          v:
            distance == null
              ? "Profile saved. Type the sentence again and it will be matched against this one."
              : distance < 0.35
                ? "Same typist, with high confidence."
                : distance < 0.7
                  ? "Plausibly the same typist."
                  : "A different rhythm from the stored profile.",
        },
        { k: "mouse samples held", v: md?.samples },
        { k: "mean pointer speed", v: md ? `${(md.meanSpeed * 1000).toFixed(0)} px/s` : undefined },
        { k: "pointer path curvature", v: md ? md.curvature.toFixed(3) : undefined, n: "hand movement signature" },
      ],
    };
    onResult(section);
    setResult(section);
  };

  const hasProfile = useClientValue(() => {
    try {
      return !!localStorage.getItem(PROFILE_KEY);
    } catch {
      return false;
    }
  }, false);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h4 className="text-base font-semibold tracking-tight">Type one sentence</h4>
        <Badge>no permission needed</Badge>
      </div>
      <p className="mt-2 max-w-[72ch] text-sm leading-relaxed text-ink-muted">
        {hasProfile && !result
          ? "A rhythm from an earlier attempt is stored in this browser. Type the sentence again and it will be compared against it."
          : "Type the sentence below. This page measures the rhythm, not the words, then saves the pattern — type it a second time and it will say whether the same person is at the keyboard."}
      </p>

      {/* the phrase is the field: clicking it focuses a transparent input */}
      <div
        onClick={() => input.current?.focus()}
        className={cx(
          "mt-4 cursor-text rounded-md border p-4 text-lg leading-relaxed",
          "transition-[border-color,box-shadow] duration-150 ease-out",
          focused ? "border-ink shadow-[0_0_0_3px_rgb(22_22_15/0.05)]" : "border-rule-strong hover:border-ink-muted"
        )}
      >
        {[...PHRASE].map((char, i) => {
          const typedChar = typed[i];
          const state =
            typedChar === undefined ? "pending" : typedChar === char ? "correct" : "wrong";
          return (
            <span
              key={i}
              className={cx(
                "relative",
                state === "pending" && "text-ink-faint",
                state === "correct" && "text-ink",
                state === "wrong" && "text-ink underline decoration-2 underline-offset-4",
                // The caret is drawn beside the character rather than as a
                // border on it: a border adds a pixel of width and nudges the
                // whole line the moment focus lands.
                focused &&
                  i === typed.length &&
                  "before:absolute before:inset-y-0 before:-left-px before:w-px before:bg-ink before:content-['']"
              )}
            >
              {char}
            </span>
          );
        })}
        <input
          ref={input}
          value={typed}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          aria-label="Type the sentence shown"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (started.current === null) started.current = performance.now();
            if (e.key.length !== 1) return;
            if (!down.current.has(e.key)) down.current.set(e.key, performance.now());
            if (lastUp.current !== null) flight.current.push(performance.now() - lastUp.current);
          }}
          onKeyUp={(e) => {
            const t = down.current.get(e.key);
            if (t !== undefined) {
              dwell.current.push(performance.now() - t);
              down.current.delete(e.key);
            }
            lastUp.current = performance.now();
          }}
          onChange={(e) => {
            const next = e.target.value.slice(0, PHRASE.length);
            setTyped(next);
            const correct = [...next].filter((c, i) => c === PHRASE[i]).length;
            const mins = minutesElapsed();
            setStats({
              accuracy: next.length ? Math.round((correct / next.length) * 100) : 100,
              wpm: mins > 0 ? Math.round(next.length / 5 / mins) : 0,
              keys: dwell.current.length,
            });
            // Finishing the sentence ends the measurement on its own.
            if (next.length === PHRASE.length) setTimeout(analyze, 0);
          }}
          className="absolute size-0 opacity-0"
        />
      </div>

      {/* live readout while typing */}
      <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-ink-muted">
        <span className="tabular">
          {typed.length} / {PHRASE.length} characters
        </span>
        <span className="tabular">{stats.accuracy}% accurate</span>
        <span className="tabular">{stats.wpm} wpm</span>
        <span className="ml-auto flex items-center gap-2">
          {result ? (
            <Button onClick={() => reset()}>Type it again</Button>
          ) : (
            <Button onClick={analyze} disabled={stats.keys < 8}>
              Analyze what I typed
            </Button>
          )}
          <Button variant="quiet" onClick={() => reset(false)}>
            Forget my profile
          </Button>
        </span>
      </div>

      {/* progress as a hairline */}
      <div className="mt-3 h-px w-full bg-rule">
        <div
          className="h-px bg-ink transition-[width] duration-150"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {result && (
        <div className="mt-5 border-t border-rule pt-4">
          <p className="max-w-[64ch] text-lg font-medium leading-snug tracking-tight">
            {String(result.rows.find((r) => r.k === "verdict")?.v)}
          </p>
          <Table cols={["46%", "auto"]} className="mt-3">
            <tbody>
              {result.rows
                .filter((r) =>
                  [
                    "mean key hold (dwell)",
                    "mean gap between keys (flight)",
                    "typing speed",
                    "distance from stored profile",
                  ].includes(r.k)
                )
                .map((r) => (
                  <tr key={r.k} className="align-top">
                    <Td className="text-sm text-ink-muted">{r.k}</Td>
                    <Td mono>{r.v === undefined ? "—" : String(r.v)}</Td>
                  </tr>
                ))}
            </tbody>
          </Table>
          <a
            href="#typing"
            className="mt-3 inline-block text-sm text-ink-muted no-underline hover:text-ink hover:underline"
          >
            Everything measured →
          </a>
        </div>
      )}
    </Card>
  );
}
