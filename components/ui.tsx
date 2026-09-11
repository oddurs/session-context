import type { ReactNode } from "react";

/* ═══════════════════════════════════════════════════════════════
   Local UI primitives. No component runtime, no Radix — just the
   handful of shapes this document needs, built on the token layer.
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
  tone?: "default" | "raised" | "alarm" | "caution";
}) {
  const tones = {
    default: "bg-surface border-rule",
    raised: "bg-raised border-rule",
    alarm: "bg-sunken border-rule-strong",
    caution: "bg-sunken border-rule",
  };
  return (
    <div className={cx("border rounded-sm", tones[tone], className)}>{children}</div>
  );
}

/* ── text bits ───────────────────────────────────────────────── */

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("label", className)}>{children}</div>;
}

export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx("text-sm text-ink-muted max-w-[76ch] leading-relaxed", className)}>
      {children}
    </p>
  );
}

/* ── badge ───────────────────────────────────────────────────── */

const BADGE_TONES = {
  neutral: "border-rule-strong text-ink-muted bg-surface",
  accent: "border-ink bg-ink text-paper",
  caution: "border-rule-strong text-ink bg-sunken",
  alarm: "border-ink text-ink bg-transparent",
  quiet: "border-rule text-ink-faint bg-transparent",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof BADGE_TONES;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 border rounded-sm px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
        BADGE_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ── button ──────────────────────────────────────────────────── */

const BUTTON_VARIANTS = {
  default:
    "bg-surface border-rule-strong text-ink hover:bg-sunken active:bg-sunken disabled:text-ink-faint disabled:hover:bg-surface",
  primary:
    "bg-ink border-ink text-paper hover:bg-ink/90 disabled:bg-ink-faint disabled:border-ink-faint",
  ghost:
    "bg-transparent border-transparent text-ink-muted hover:bg-sunken hover:text-ink disabled:text-ink-faint",
};

export function Button({
  children,
  onClick,
  disabled,
  variant = "default",
  className,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: keyof typeof BUTTON_VARIANTS;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center gap-1.5 border rounded-sm px-2.5 py-1 text-sm transition-colors disabled:cursor-not-allowed",
        BUTTON_VARIANTS[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

/* ── toggle ──────────────────────────────────────────────────── */

export function Switch({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-ink-muted cursor-pointer select-none">
      <span
        className={cx(
          "relative h-4 w-7 rounded-full border transition-colors",
          checked ? "bg-ink border-ink" : "bg-sunken border-rule-strong"
        )}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className={cx(
            "absolute top-0.5 h-2.5 w-2.5 rounded-full transition-all",
            checked ? "left-3.5 bg-paper" : "left-0.5 bg-ink-faint"
          )}
        />
      </span>
      {children}
    </label>
  );
}

/* ── tooltip (CSS only, hover + keyboard) ────────────────────── */

export function Tooltip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span className="group/tip relative inline-flex align-middle" tabIndex={0} role="note">
      {children}
      <span
        className="pointer-events-none invisible absolute left-0 top-[calc(100%+6px)] z-50 w-[min(22rem,70vw)]
                   rounded-sm bg-ink px-3 py-2 font-sans text-sm leading-snug font-normal
                   text-paper opacity-0 shadow-lg transition-opacity duration-100
                   group-hover/tip:visible group-hover/tip:opacity-100
                   group-focus/tip:visible group-focus/tip:opacity-100"
      >
        {label}
      </span>
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
        className="flex cursor-pointer list-none items-center gap-1.5 text-sm text-ink-muted
                   marker:content-none hover:text-ink"
      >
        <svg
          viewBox="0 0 16 16"
          className="size-3 shrink-0 transition-transform group-open/disc:rotate-90"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
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

export function Th({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cx(
        "label sticky top-11 z-10 border-b border-rule-strong bg-paper pb-1.5 pr-3 pt-1.5 text-left align-bottom",
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
        "border-b border-rule py-1.5 pr-3 align-top break-words [overflow-wrap:anywhere]",
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

/* ── code block ──────────────────────────────────────────────── */

export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-sm border border-rule bg-sunken p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap break-all">
      {children}
    </pre>
  );
}
