import type { ReactNode } from "react";

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
        "inline-flex items-center gap-1.5 bg-transparent text-sm transition-colors disabled:cursor-not-allowed",
        BUTTON_VARIANTS[variant],
        className
      )}
    >
      {children}
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

/* ── tooltip: a light annotation panel ───────────────────────── */

export function Tooltip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span className="group/tip relative inline-flex align-middle" tabIndex={0} role="note">
      {children}
      <span
        className="pointer-events-none invisible absolute left-0 top-[calc(100%+6px)] z-50 w-[min(23rem,72vw)]
                   border border-rule-strong bg-surface px-3 py-2 font-sans text-sm font-normal leading-snug
                   text-ink opacity-0 shadow-[0_6px_20px_-8px_rgba(0,0,0,0.28)] transition-opacity duration-100
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
    <pre className="overflow-x-auto border border-rule bg-sunken p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap break-all">
      {children}
    </pre>
  );
}
