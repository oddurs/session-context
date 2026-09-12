import { DECLINED, METHOD_GROUPS } from "@/lib/methods";
import { SiteHeader } from "@/components/SiteHeader";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui";
import { Fragment } from "react";

/** Render `backticked` spans as inline code — the only mono on this page. */
function Text({ children }: { children: string }) {
  return (
    <>
      {children.split(/(`[^`]+`)/g).map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code key={i} className="font-mono text-[0.95em] text-ink">
            {part.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

export const metadata = {
  title: "Methods · Session Context",
  description: "Every technique this page uses, how it works, and what browsers have done about it.",
};

export default function MethodsPage() {
  const total = METHOD_GROUPS.reduce((n, g) => n + g.methods.length, 0);

  return (
    <main className="mx-auto max-w-page px-4 pb-24 sm:px-6">
      <SiteHeader
        current="methods"
        title="How each of these works"
        lede={`The ${total} techniques used on this site, what each one exposes, the mechanism behind it, and where browser defenses currently stand. Every one is implemented and running — nothing here is hypothetical.`}
        note="Written to be read alongside the data page: each entry links to the table it produces."
      />

      <nav className="mt-8 mb-12 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {METHOD_GROUPS.map((g) => (
          <a key={g.id} href={`#${g.id}`} className="flex items-center gap-1.5 no-underline hover:underline">
            <Icon name={g.icon} className="size-3.5 text-ink-faint" />
            {g.title}
            <span className="text-ink-faint tabular">{g.methods.length}</span>
          </a>
        ))}
        <a href="#declined" className="no-underline hover:underline">
          Deliberately not built <span className="text-ink-faint tabular">{DECLINED.length}</span>
        </a>
      </nav>

      {METHOD_GROUPS.map((g) => (
        <section key={g.id} id={g.id} className="mb-14">
          <h3 className="flex items-center gap-2 border-b border-ink pb-2 text-xl font-semibold tracking-tight">
            <Icon name={g.icon} className="size-4 text-ink-muted" />
            {g.title}
          </h3>
          <p className="mt-2 mb-6 max-w-[76ch] text-sm leading-relaxed text-ink-muted">{g.intro}</p>

          <div className="grid gap-3 lg:grid-cols-2">
            {g.methods.map((m) => (
              <Card key={m.name} className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="text-base font-semibold tracking-tight">{m.name}</h4>
                  {m.section && (
                    <a href={`/#${m.section}`} className="text-sm text-ink-muted no-underline hover:text-ink hover:underline">
                      see the data →
                    </a>
                  )}
                </div>
                <dl className="mt-3 space-y-2.5 text-sm leading-relaxed">
                  <div>
                    <dt className="label">What it exposes</dt>
                    <dd className="mt-0.5"><Text>{m.reveals}</Text></dd>
                  </div>
                  <div>
                    <dt className="label">How it works</dt>
                    <dd className="mt-0.5 text-ink-muted"><Text>{m.how}</Text></dd>
                  </div>
                  <div>
                    <dt className="label">Where defenses stand</dt>
                    <dd className="mt-0.5 text-ink-muted"><Text>{m.status}</Text></dd>
                  </div>
                </dl>
              </Card>
            ))}
          </div>
        </section>
      ))}

      <section id="declined" className="mb-14">
        <h3 className="border-b border-ink pb-2 text-xl font-semibold tracking-tight">
          Deliberately not built
        </h3>
        <p className="mt-2 mb-6 max-w-[76ch] text-sm leading-relaxed text-ink-muted">
          A demonstration of surveillance should not itself be surveillance. These
          techniques are real, documented and would have worked here; each was left
          out for a stated reason.
        </p>
        <div className="grid gap-3 lg:grid-cols-2">
          {DECLINED.map((d) => (
            <Card key={d.name} tone="raised" className="p-4">
              <h4 className="text-base font-semibold tracking-tight">{d.name}</h4>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{d.why}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="mt-16 border-t border-rule pt-4 text-sm leading-relaxed text-ink-muted">
        <p className="max-w-[76ch]">
          Built with FingerprintJS, ua-parser-js and detectIncognito alongside
          direct platform probes. Every value on the data page is computed and
          displayed locally; nothing is transmitted, and no part of this site
          contacts another company.
        </p>
      </footer>
    </main>
  );
}
