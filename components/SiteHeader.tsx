import Link from "next/link";
import { Icon } from "./Icon";
import { REPO_URL } from "@/lib/site";

/** Masthead and cross-page navigation, shared by both routes. */
export function SiteHeader({
  current,
  title,
  lede,
  note,
}: {
  current: "data" | "methods";
  title: string;
  lede: string;
  note?: string;
}) {
  const tabs = [
    { id: "data", href: "/", label: "Findings & data" },
    { id: "methods", href: "/methods", label: "Methods" },
  ] as const;

  return (
    <header className="pt-12 pb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 border-b border-rule pb-3">
        {/* The wordmark identifies the site on both routes; the page's own
            subject is the heading below it. */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[1.9rem] font-semibold leading-none tracking-[-0.025em] no-underline"
        >
          <Icon name="fingerprint" className="size-7 shrink-0" />
          Session Context
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              className={
                t.id === current
                  ? "font-medium no-underline"
                  : "text-ink-muted no-underline hover:text-ink hover:underline"
              }
            >
              {t.label}
            </Link>
          ))}
          {REPO_URL && (
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-ink-muted no-underline hover:text-ink hover:underline"
            >
              <Icon name="github" className="size-3.5" />
              Source
            </a>
          )}
        </nav>
      </div>
      <h1 className="mt-7 max-w-[46ch] text-xl font-medium leading-snug tracking-[-0.015em]">
        {title}
      </h1>
      <p className="mt-3 max-w-[68ch] text-base leading-[1.65] text-ink-muted">{lede}</p>
      {note && (
        <p className="mt-4 max-w-[64ch] border-t border-rule pt-3 text-sm leading-relaxed text-ink-faint">
          {note}
        </p>
      )}
    </header>
  );
}
