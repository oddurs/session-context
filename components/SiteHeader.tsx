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
    <header className="border-b-2 border-ink pt-10 pb-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Session Context</h1>
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
      <h2 className="mt-4 text-lg font-medium tracking-tight">{title}</h2>
      <p className="mt-2 max-w-[74ch] text-base leading-relaxed text-ink-muted">{lede}</p>
      {note && (
        <p className="mt-2 max-w-[74ch] text-sm leading-relaxed text-ink-faint">{note}</p>
      )}
    </header>
  );
}
