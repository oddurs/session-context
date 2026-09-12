"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   UI primitives. Minimal and typographic: hairline rules, no
   filled controls, hierarchy carried by type size and weight.
   ═══════════════════════════════════════════════════════════════ */

export function cx(...parts: (string | false | undefined | null)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ── surfaces ────────────────────────────────────────────────── */

export function Card({
  children,
  className,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "raised";
}) {
  return (
    <div
      className={cx(
        "border border-rule",
        tone === "raised" ? "bg-raised" : "bg-surface",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ── text ────────────────────────────────────────────────────── */

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("label", className)}>{children}</div>;
}

/**
 * A section label bound to its content by a hairline. Without the rule these
 * read as fragments floating in whitespace.
 */
export function RuleHeading({
  children,
  className,
  as: Tag = "h4",
}: {
  children: ReactNode;
  className?: string;
  as?: "h2" | "h3" | "h4";
}) {
  return (
    <Tag className={cx("flex items-center gap-3 text-sm font-medium text-ink-muted", className)}>
      <span className="flex shrink-0 items-center gap-2">{children}</span>
      <span aria-hidden className="h-px flex-1 bg-rule" />
    </Tag>
  );
}

/* ── badge: a caption, not a chip ────────────────────────────── */

export function Badge({
  children,
  tone = "quiet",
  className,
}: {
  children: ReactNode;
  tone?: "quiet" | "outline";
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-xs",
        tone === "outline"
          ? "border border-rule px-1.5 py-0.5 text-ink-muted"
          : "text-ink-faint",
        className
      )}
    >
      {children}
    </span>
  );
}

/* ── button: hairline outline or plain text, never filled ────── */

const BUTTON_VARIANTS = {
  default:
    "border border-rule-strong px-2.5 py-1 text-ink hover:bg-sunken disabled:border-rule disabled:text-ink-faint disabled:hover:bg-transparent",
  quiet:
    "border border-transparent px-1.5 py-1 text-ink-muted hover:text-ink hover:underline disabled:text-ink-faint disabled:no-underline",
};

export function Button({
  children,
  onClick,
  disabled,
  variant = "default",
  className,
  title,
  label,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: keyof typeof BUTTON_VARIANTS;
  className?: string;
  title?: string;
  /** Required when the button is an icon alone: it has no text to read. */
  label?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center gap-1.5 bg-transparent text-sm transition-colors disabled:cursor-not-allowed",
        BUTTON_VARIANTS[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

/* ── menu ────────────────────────────────────────────────────── */

/**
 * A small menu for actions that belong together. Written here rather than
 * installed: it needs to close on outside clicks and on Escape, and nothing
 * else.
 */
export function Menu({
  label,
  children,
  align = "right",
}: {
  label: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative" onClick={() => setOpen(false)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cx(
          "inline-flex items-center gap-1.5 border border-transparent px-1.5 py-1 text-sm transition-colors",
          open ? "text-ink" : "text-ink-muted hover:text-ink"
        )}
      >
        {label}
        <svg
          viewBox="0 0 16 16"
          className={cx("size-3 transition-transform", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 6.5 8 10.5l4-4" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className={cx(
            "absolute top-[calc(100%+6px)] z-50 min-w-[13rem] border border-rule-strong bg-surface py-1",
            "shadow-[0_6px_20px_-8px_rgb(0_0_0/0.28)] motion-safe:animate-[rise-in_140ms_ease-out]",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  children,
  onSelect,
  hint,
}: {
  children: ReactNode;
  onSelect: () => void;
  /** a quiet note on the right, such as a file type */
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className="flex w-full items-baseline gap-4 px-3 py-1.5 text-left text-sm text-ink hover:bg-sunken"
    >
      <span className="flex-1">{children}</span>
      {hint && <span className="font-mono text-xs text-ink-faint">{hint}</span>}
    </button>
  );
}

/* ── checkbox ────────────────────────────────────────────────── */

export function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm text-ink-muted hover:text-ink">
      {/* The mark is always present and only changes opacity, so checking it
          cannot shift the baseline. */}
      <span
        className={cx(
          "relative grid size-3.5 shrink-0 place-items-center border leading-none transition-colors",
          checked ? "border-ink" : "border-rule-strong"
        )}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <svg
          viewBox="0 0 12 12"
          className={cx("size-2.5 transition-opacity", checked ? "opacity-100" : "opacity-0")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M2.5 6.2 4.8 8.5 9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {children}
    </label>
  );
}

/* ── tooltip ─────────────────────────────────────────────────── */

/**
 * The panel is drawn by a pseudo-element from `data-tip`, so several hundred
 * tooltips cost one element each instead of an element, a span and a text
 * node. The same text reaches assistive technology through `aria-label`.
 */
export function Tooltip({
  children,
  label,
  focusable,
}: {
  children: ReactNode;
  label: string;
  /** Only for tooltips that are the sole source of their information. */
  focusable?: boolean;
}) {
  return (
    <span
      className="tip relative inline-flex align-middle"
      data-tip={label}
      // Hundreds of these appear in the tables. Making each one a tab stop
      // would bury every real control, so the text reaches assistive
      // technology by label instead.
      tabIndex={focusable ? 0 : undefined}
      role="note"
      aria-label={label}
    >
      {children}
    </span>
  );
}

/* ── disclosure ──────────────────────────────────────────────── */

export function Disclosure({
  summary,
  children,
  className,
}: {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={cx("group/disc", className)}>
      <summary
        className="inline-flex cursor-pointer list-none items-center gap-1 text-sm text-ink-muted
                   marker:content-none hover:text-ink hover:underline"
      >
        <svg
          viewBox="0 0 16 16"
          className="size-3 shrink-0 text-ink-faint transition-transform group-open/disc:rotate-90"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
        {summary}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

/* ── table ───────────────────────────────────────────────────── */

export function Table({
  children,
  className,
  cols,
}: {
  children: ReactNode;
  className?: string;
  /** column widths, as a fraction of the table */
  cols?: string[];
}) {
  return (
    <table className={cx("w-full table-fixed border-collapse", className)}>
      {cols && (
        <colgroup>
          {cols.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
      )}
      {children}
    </table>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={cx(
        "label sticky top-11 z-10 border-b border-rule bg-paper py-2 pr-4 text-left align-bottom font-normal",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  mono,
}: {
  children: ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <td
      className={cx(
        "border-b border-rule py-2 pr-4 align-top break-words [overflow-wrap:anywhere]",
        mono && "font-mono text-sm",
        className
      )}
    >
      {children}
    </td>
  );
}

/* ── stat ────────────────────────────────────────────────────── */

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-0.5 font-mono text-base tabular">{value}</div>
    </div>
  );
}

/* ── code ────────────────────────────────────────────────────── */

export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto border border-rule bg-sunken p-3 font-mono text-sm leading-relaxed whitespace-pre">
      {children}
    </pre>
  );
}
