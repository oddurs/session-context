import { CATALOGUE, DECLINED, METHOD_GROUPS } from "@/lib/methods";
import { SiteHeader } from "@/components/SiteHeader";
import { MethodsBar } from "@/components/MethodsNav";
import { MethodsSummary } from "@/components/MethodsSummary";
import { MethodEntry } from "@/components/MethodEntry";
import { Icon } from "@/components/Icon";
import { RuleHeading } from "@/components/ui";

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

/** The only two things this server remembers, and for how long. */
const KEPT = [
  {
    what: "The ETag identifier, and how often you return it",
    life: "in memory, up to 24 hours",
    why: "The server tags one response and your browser hands the tag back on every revalidation. Counting those is the demonstration: it is how a site recognizes a returning visitor with no cookie and no script. The record is three values — first seen, last seen, a count — against a random identifier that means nothing anywhere else.",
  },
  {
    what: "Which CSS conditions your browser matched",
    life: "in memory, up to 24 hours",
    why: "The CSS-only fingerprint works by loading a different image for each condition that is true. The server has to remember which images were requested in order to show you the result afterwards — otherwise the technique could be described but not demonstrated. Tied to this visit, and to nothing else.",
  },
];

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
    <main id="main" className="mx-auto max-w-page px-4 pb-major sm:px-6">
      <SiteHeader
        current="methods"
        title="How each of these works"
        lede={`The ${total} techniques running on this site: what each one exposes, the mechanism behind it, and where browser defenses currently stand. Every one is implemented — nothing here is hypothetical.`}
        note="Written to be read alongside the data page: each entry links to the table it produces."
      />

      <dl className="grid grid-cols-2 gap-y-body border-b border-rule py-body sm:grid-cols-4">
        {dateline.map((d, i) => (
          <div
            key={d.label}
            className={cxIfFirst(i)}
          >
            <dt className="text-xs text-ink-faint">{d.label}</dt>
            <dd className="mt-hair text-lg font-medium leading-none tracking-[-0.01em] tabular">
              {d.value}
            </dd>
          </div>
        ))}
      </dl>

      <MethodsBar />

      {/*
        * No index rail: this is a catalogue rather than a record, and its
        * index is the table above, which carries information a list of links
        * could not. The column is measured for reading instead.
        */}
      <MethodsSummary />

      <div>
        <div className="min-w-0 max-w-wide">
          {CATALOGUE.map((g) => (
            <section key={g.id} id={g.id} className="mt-section first:mt-0">
              <RuleHeading as="h2" className="mb-tight">
                <Icon name={g.icon} className="size-4 text-ink-faint" />
                {g.title}
              </RuleHeading>
              <p className="mb-body max-w-text text-sm text-ink-muted">
                {g.intro}
              </p>

              {g.methods.map((m) => (
                <MethodEntry key={m.name} method={m} />
              ))}
            </section>
          ))}

          <section id="declined" className="mt-section">
            <RuleHeading as="h2" className="mb-tight">
              <Icon name="shield" className="size-4 text-ink-faint" />
              Deliberately not built
            </RuleHeading>
            <div className="mb-body">
              <p className="max-w-text text-sm text-ink-muted">
                A demonstration of surveillance should not itself be surveillance. These
                techniques are real, documented, and would have worked here. Each was left
                out for a stated reason.
              </p>
            </div>
            {DECLINED.map((d) => (
              <article key={d.name} className="border-t border-rule py-item first:border-t-0 first:pt-0">
                <h3 className="text-lg font-medium tracking-tight">{d.name}</h3>
                <p className="mt-tight max-w-text text-sm text-ink-muted">{d.why}</p>
              </article>
            ))}
          </section>

          {/*
            * A site arguing that recognition should be visible has to be
            * legible about its own. Two demonstrations here cannot work
            * without the server remembering something, and a sweeping "nothing
            * is transmitted" would have been both untrue and checkable in the
            * source — which is linked from every page.
            */}
          <section id="kept" className="mt-section">
            <RuleHeading as="h2" className="mb-tight">
              <Icon name="database" className="size-4 text-ink-faint" />
              What this site keeps
            </RuleHeading>
            <div className="mb-body">
              <p className="max-w-text text-sm text-ink-muted">
                Most of the data page is measured in your browser and never sent
                anywhere. Two demonstrations are the exception, because neither can
                be shown without a server that remembers — and being vague about
                that would make this page the thing it is arguing against.
              </p>
            </div>
            {KEPT.map((k) => (
              <article key={k.what} className="border-t border-rule py-item first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-group gap-y-hair">
                  <h3 className="text-lg font-medium tracking-tight">{k.what}</h3>
                  <span className="text-sm text-ink-faint">{k.life}</span>
                </div>
                <p className="mt-tight max-w-text text-sm text-ink-muted">{k.why}</p>
              </article>
            ))}
            <p className="mt-body max-w-text text-sm text-ink-muted">
              Both live in a bounded map in the server&rsquo;s memory, capped at five
              thousand entries and pruned after a day. Nothing is written to disk,
              there is no database, and a restart forgets everyone. No analytics,
              no third party, and no IP-geolocation lookup — an address is never
              sent anywhere to be turned into a place.
            </p>
          </section>

          <RuleHeading className="mt-section mb-body">Built with</RuleHeading>
          <p className="max-w-text text-sm text-ink-muted">
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
