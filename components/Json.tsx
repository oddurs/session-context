"use client";

import { useState } from "react";
import { MoreToggle, cx } from "./ui";

/**
 * Pretty-printed JSON with monochrome emphasis: keys carry the weight, string
 * values sit back, punctuation recedes. Long documents collapse by line rather
 * than by character, so the indentation always survives.
 */
const COLLAPSED_LINES = 12;

/**
 * One value can be longer than a whole document: FingerprintJS reports its
 * canvas as a base64 data URI, and at a hundred thousand characters that line
 * laid out a hundred thousand pixels wide inside a horizontally scrolling
 * block. Nobody reads a base64 PNG, and this site does not scroll sideways —
 * so a string past this length is cut and counted instead.
 */
const LONGEST_VALUE = 160;

const shorten = (line: string) =>
  line.replace(/"(?:\\.|[^"\\])*"/g, (match) =>
    match.length > LONGEST_VALUE
      ? `${match.slice(0, LONGEST_VALUE)}…" and ${(match.length - LONGEST_VALUE).toLocaleString()} more characters`
      : match
  );

function tokenize(line: string) {
  // Split into strings, numbers/keywords and everything else.
  const parts = line.split(/("(?:\\.|[^"\\])*"(?:\s*:)?|\b-?\d+\.?\d*(?:e[+-]?\d+)?\b|\btrue\b|\bfalse\b|\bnull\b)/gi);
  return parts.filter(Boolean).map((part, i) => {
    if (/^"(?:\\.|[^"\\])*"\s*:$/.test(part))
      return (
        <span key={i} className="text-ink">
          {part}
        </span>
      );
    if (/^"/.test(part))
      return (
        <span key={i} className="text-ink-muted">
          {part}
        </span>
      );
    if (/^(-?\d|true|false|null)/i.test(part))
      return (
        <span key={i} className="text-ink tabular">
          {part}
        </span>
      );
    return (
      <span key={i} className="text-ink-faint">
        {part}
      </span>
    );
  });
}

export function Json({ value, dense }: { value: unknown; dense?: boolean }) {
  const [open, setOpen] = useState(false);

  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2) ?? String(value);
  const lines = text.split("\n").map(shorten);
  const truncated = !open && lines.length > COLLAPSED_LINES;
  const shown = truncated ? lines.slice(0, COLLAPSED_LINES) : lines;

  return (
    <>
      <pre
        className={cx(
          "whitespace-pre-wrap [overflow-wrap:anywhere] font-mono text-sm",
          !dense && "rounded-md border border-rule bg-sunken p-3"
        )}
      >
        <code>
          {shown.map((line, i) => (
            <span key={i} className="block">
              {tokenize(line)}
            </span>
          ))}
          {truncated && <span className="block text-ink-faint">…</span>}
        </code>
      </pre>
      {lines.length > COLLAPSED_LINES && (
        <span className="mt-hair inline-block">
          <MoreToggle
            open={open}
            onToggle={() => setOpen(!open)}
            more={`show all ${lines.length.toLocaleString()} lines`}
            less="show less"
          />
        </span>
      )}
    </>
  );
}

/** True when a string is worth rendering as a JSON document. */
export function looksLikeJson(v: unknown): boolean {
  if (v && typeof v === "object") return true;
  if (typeof v !== "string") return false;
  const t = v.trim();
  if (!(t.startsWith("{") || t.startsWith("[")) || t.length < 8) return false;
  try {
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
}
