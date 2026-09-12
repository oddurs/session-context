"use client";

import { useRef, useState } from "react";
import type { Section } from "@/lib/types";
import { mouseDynamics } from "@/lib/collect";
import { Badge, Button, Card, Table, Td } from "./ui";

const PHRASE = "the quick brown fox jumps over the lazy dog";
const PROFILE_KEY = "dm_typing_profile";

type Profile = { dwell: number; flight: number; sdDwell: number; sdFlight: number; wpm: number };

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const sd = (a: number[]) => {
  const m = mean(a);
  return a.length ? Math.sqrt(mean(a.map((v) => (v - m) ** 2))) : 0;
};

/**
 * Keystroke dynamics: how long you hold each key (dwell) and how long you take
 * between keys (flight). The pattern is stable per person and is used
 * commercially for continuous authentication and fraud scoring.
 */
export function TypingBiometrics({ onResult }: { onResult: (s: Section) => void }) {
  const [text, setText] = useState("");
  const [count, setCount] = useState(0);
  const [result, setResult] = useState<Section | null>(null);
  const [status, setStatus] = useState<"idle" | "typing" | "done">("idle");
  const down = useRef<Map<string, number>>(new Map());
  const dwell = useRef<number[]>([]);
  const flight = useRef<number[]>([]);
  const lastUp = useRef<number | null>(null);
  const started = useRef<number | null>(null);

  const reset = () => {
    setText("");
    setStatus("idle");
    down.current.clear();
    dwell.current = [];
    flight.current = [];
    lastUp.current = null;
    started.current = null;
    setCount(0);
    setResult(null);
  };

  const finish = () => {
    const profile: Profile = {
      dwell: mean(dwell.current),
      flight: mean(flight.current),
      sdDwell: sd(dwell.current),
      sdFlight: sd(flight.current),
      wpm: started.current
        ? (text.trim().split(/\s+/).length / ((performance.now() - started.current) / 60000))
        : 0,
    };

    let stored: Profile | null = null;
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      stored = raw ? (JSON.parse(raw) as Profile) : null;
    } catch {
      /* storage blocked */
    }

    // Normalised distance between this sample and the stored profile.
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
        "Nothing here identifies what you typed — only how. Hold times and gaps between keys are consistent enough per person that banks and fraud systems use them to tell whether the same human is at the keyboard, and they are readable by any page without a permission prompt.",
      rows: [
        { k: "characters measured", v: dwell.current.length },
        { k: "mean key hold (dwell)", v: `${profile.dwell.toFixed(1)} ms` },
        { k: "hold consistency (σ)", v: `${profile.sdDwell.toFixed(1)} ms`, n: "lower is more machine-like" },
        { k: "mean gap between keys (flight)", v: `${profile.flight.toFixed(1)} ms` },
        { k: "gap consistency (σ)", v: `${profile.sdFlight.toFixed(1)} ms` },
        { k: "typing speed", v: `${profile.wpm.toFixed(0)} words per minute` },
        { k: "stored profile existed", v: !!stored, n: "from an earlier attempt on this browser" },
        { k: "distance from stored profile", v: distance != null ? distance.toFixed(3) : undefined },
        {
          k: "verdict",
          v:
            distance == null
              ? "profile saved — type it again to be matched against this one"
              : distance < 0.35
                ? "same typist, with high confidence"
                : distance < 0.7
                  ? "plausibly the same typist"
                  : "different rhythm from the stored profile",
        },
        { k: "mouse samples held", v: md?.samples },
        { k: "mean pointer speed", v: md ? `${(md.meanSpeed * 1000).toFixed(0)} px/s` : undefined },
        { k: "pointer path curvature", v: md ? md.curvature.toFixed(3) : undefined, n: "hand movement signature" },
      ],
    };
    onResult(section);
    setResult(section);
    setStatus("done");
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h4 className="text-base font-semibold tracking-tight">Type one sentence</h4>
        <Badge>no permission needed</Badge>
      </div>
      <p className="mt-2 max-w-[76ch] text-sm leading-relaxed text-ink-muted">
        Type the phrase below. The page measures the rhythm, not the words, and
        saves the pattern — type it a second time and it will tell you whether
        it thinks the same person is at the keyboard.
      </p>
      <p className="mt-3 text-base text-ink select-none">“{PHRASE}”</p>
      <input
        value={text}
        spellCheck={false}
        autoComplete="off"
        placeholder="type it here…"
        onKeyDown={(e) => {
          if (started.current === null) {
            started.current = performance.now();
            setStatus("typing");
          }
          if (!down.current.has(e.key)) down.current.set(e.key, performance.now());
          if (lastUp.current !== null) flight.current.push(performance.now() - lastUp.current);
        }}
        onKeyUp={(e) => {
          const t = down.current.get(e.key);
          if (t !== undefined) {
            dwell.current.push(performance.now() - t);
            down.current.delete(e.key);
            setCount(dwell.current.length);
          }
          lastUp.current = performance.now();
        }}
        onChange={(e) => setText(e.target.value)}
        className="mt-2 w-full rounded-sm border border-rule-strong bg-surface px-3 py-2 text-base
                   outline-none placeholder:text-ink-faint focus:border-ink"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={finish} disabled={count < 8}>
          Analyse my typing
        </Button>
        <Button variant="quiet" onClick={reset}>
          Start over
        </Button>
        {status !== "done" && (
          <span className="text-sm text-ink-faint tabular">
            {count} keystrokes measured
          </span>
        )}
      </div>

      {result && (
        <div className="mt-4 border-t border-rule pt-4">
          <p className="text-base leading-snug">
            {String(result.rows.find((r) => r.k === "verdict")?.v)}
          </p>
          <Table cols={["46%", "auto"]} className="mt-3">
            <tbody>
              {result.rows
                .filter((r) =>
                  ["mean key hold (dwell)", "mean gap between keys (flight)", "typing speed", "distance from stored profile"].includes(r.k)
                )
                .map((r) => (
                  <tr key={r.k} className="align-top">
                    <Td className="text-sm text-ink-muted">{r.k}</Td>
                    <Td mono>{r.v === undefined ? "—" : String(r.v)}</Td>
                  </tr>
                ))}
            </tbody>
          </Table>
          <a href="#typing" className="mt-3 inline-block text-sm text-ink-muted no-underline hover:text-ink hover:underline">
            Everything measured →
          </a>
        </div>
      )}
    </Card>
  );
}
