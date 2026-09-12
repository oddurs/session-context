import { Fragment } from "react";
import { DECLINED, METHOD_GROUPS } from "@/lib/methods";
import { SiteHeader } from "@/components/SiteHeader";
import { MethodsBar, MethodsContents } from "@/components/MethodsNav";
import { Icon } from "@/components/Icon";
import { Disclosure, RuleHeading } from "@/components/ui";

export const metadata = {
  title: "Methods",
  description:
    "The 36 techniques this site uses to identify a visitor, how each one works, what it exposes, and where browser defenses currently stand.",
  alternates: { canonical: "/methods" },
  openGraph: {
    title: "Methods — how each technique works",
    description:
      "Passive collection, fingerprinting, respawning identifiers, cross-site tracking and permission-gated APIs: what each exposes and how browsers have responded.",
    url: "/methods",
  },
};

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

export default function MethodsPage() {
  const total = METHOD_GROUPS.reduce((n, g) => n + g.methods.length, 0);
  const gated = METHOD_GROUPS.find((g) => g.id === "gated")?.methods.length ?? 0;

  const dateline = [
    { label: "Techniques", value: total },
    { label: "Need no permission", value: total - gated },
    { label: "Ask first", value: gated },
    { label: "Left unbuilt", value: DECLINED.length },
  ];

  return (
    <main id="main" className="mx-auto max-w-page px-4 pb-24 sm:px-6">
      <SiteHeader
        current="methods"
        title="How each of these works"
        lede={`The ${total} techniques running on this site: what each one exposes, the mechanism behind it, and where browser defenses currently stand. Every one is implemented — nothing here is hypothetical.`}
        note="Written to be read alongside the data page: each entry links to the table it produces."
      />

      <dl className="grid grid-cols-2 gap-y-4 border-b border-rule py-4 sm:grid-cols-4">
        {dateline.map((d, i) => (
          <div
            key={d.label}
            className={cxIfFirst(i)}
          >
            <dt className="text-xs text-ink-faint">{d.label}</dt>
            <dd className="mt-1 text-[1.05rem] font-medium leading-none tracking-[-0.01em] tabular">
              {d.value}
            </dd>
          </div>
        ))}
      </dl>

      <MethodsBar />

      <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <MethodsContents />

        <div className="min-w-0">
          {METHOD_GROUPS.map((g) => (
            <section key={g.id} id={g.id} className="mt-12 first:mt-0">
              <RuleHeading as="h2" className="mb-2">
                <Icon name={g.icon} className="size-4 text-ink-faint" />
                {g.title}
              </RuleHeading>
              <p className="mb-6 max-w-[74ch] text-sm leading-relaxed text-ink-muted">
                {g.intro}
              </p>

              {g.methods.map((m) => (
                <article key={m.name} className="border-t border-rule py-5 first:border-t-0 first:pt-3">
                  <h3 className="max-w-[58ch] text-lg font-medium leading-snug tracking-tight">
                    {m.name}
                  </h3>
                  <p className="mt-2 max-w-[72ch] text-sm leading-relaxed text-ink-muted">
                    <Text>{m.reveals}</Text>
                  </p>
                  <p className="mt-2 max-w-[72ch] text-sm leading-relaxed text-ink-muted">
                    <Text>{m.how}</Text>
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                    <span className="text-xs text-ink-faint">{m.standing}</span>
                    <Disclosure summary="Where defenses stand">
                      <p className="max-w-[72ch] border-t border-rule pt-2 text-sm leading-relaxed text-ink-muted">
                        <Text>{m.status}</Text>
                      </p>
                    </Disclosure>
                    {m.section && (
                      <a
                        href={`/#${m.section}`}
                        className="text-sm text-ink-muted no-underline hover:text-ink hover:underline"
                      >
                        See the data →
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </section>
          ))}

          <section id="declined" className="mt-12">
            <RuleHeading as="h2" className="mb-2">
              <Icon name="shield" className="size-4 text-ink-faint" />
              Deliberately not built
            </RuleHeading>
            <div className="mb-6">
              <p className="max-w-[74ch] text-sm leading-relaxed text-ink-muted">
                A demonstration of surveillance should not itself be surveillance. These
                techniques are real, documented, and would have worked here. Each was left
                out for a stated reason.
              </p>
            </div>
            {DECLINED.map((d) => (
              <article key={d.name} className="border-t border-rule py-5 first:border-t-0 first:pt-3">
                <h3 className="text-lg font-medium leading-snug tracking-tight">{d.name}</h3>
                <p className="mt-2 max-w-[72ch] text-sm leading-relaxed text-ink-muted">{d.why}</p>
              </article>
            ))}
          </section>

          <RuleHeading className="mt-12 mb-3">Built with</RuleHeading>
          <p className="max-w-[74ch] text-sm leading-relaxed text-ink-muted">
            FingerprintJS, ua-parser-js and detectIncognito alongside direct platform
            probes. Every value on the data page is computed and displayed locally;
            nothing is transmitted, and no part of this site contacts another company.
          </p>
        </div>
      </div>
    </main>
  );
}

/** Hairline dividers between dateline cells, but not before the first. */
function cxIfFirst(i: number) {
  return i > 0 ? "min-w-0 border-l border-rule pl-5" : "min-w-0";
}
