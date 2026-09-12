import Link from "next/link";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { REPO_URL } from "@/lib/site";

/** Masthead and cross-page navigation, shared by both routes. */
export function SiteHeader({
  current,
  title,
  lede,
  note,
}: {
  /** "none" for pages that are reachable only by URL, such as the design notes */
  current: "data" | "methods" | "none";
  title: string;
  lede: string;
  note?: string;
}) {
  const tabs = [
    { id: "data", href: "/", label: "Findings & data" },
    { id: "methods", href: "/methods", label: "Methods" },
  ] as const;

  return (
    <header className="pt-section pb-body">
      <div className="flex flex-wrap items-baseline justify-between gap-x-group gap-y-snug border-b border-ink pb-snug">
        {/* The wordmark identifies the site on both routes; the page's own
            subject is the heading below it. */}
        <Link
          href="/"
          className="flex items-center gap-snug text-display font-semibold tracking-[-0.025em] no-underline"
        >
          <Logo className="h-8 w-auto shrink-0" />
          Session Context
        </Link>
        <nav className="flex items-center gap-body text-sm pointer-coarse:-my-1.5 pointer-coarse:[&_a]:py-1.5">
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
              className="flex items-center gap-hair text-ink-muted no-underline hover:text-ink hover:underline"
            >
              <Icon name="github" className="size-3.5" />
              Source
            </a>
          )}
        </nav>
      </div>
      <h1 className="mt-group max-w-title text-xl font-medium tracking-[-0.015em]">
        {title}
      </h1>
      <p className="mt-tight max-w-text text-base text-ink-muted">{lede}</p>
      {note && (
        <p className="mt-body max-w-lede border-t border-rule pt-snug text-sm text-ink-faint">
          {note}
          {current === "data" && (
            <>
              {" "}
              <Link href="/methods" className="text-ink-muted">
                How each technique works →
              </Link>
            </>
          )}
        </p>
      )}
    </header>
  );
}
