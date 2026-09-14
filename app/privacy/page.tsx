import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { RuleHeading } from "@/components/ui";
import { REPO_URL } from "@/lib/site";

export const metadata = {
  title: "Privacy",
  description:
    "What this site stores, what its server remembers, for how long, and what it never does. Written plainly, because a page about tracking has no business being vague about its own.",
};

/**
 * Every claim here is checkable in the source, which is linked from the top of
 * every page. That is the only reason to write one of these at all: a privacy
 * page nobody can verify is decoration.
 */
const SECTIONS: { id: string; title: string; body: string[] }[] = [
  {
    id: "summary",
    title: "The short version",
    body: [
      "Nothing about you is collected for any purpose of this site's own. There is no analytics, no advertising, no third-party script, and nothing is ever sold or shared. Two of the demonstrations need the server to remember something for up to a day, and both are described below.",
    ],
  },
  {
    id: "local",
    title: "What stays in your browser",
    body: [
      "Almost every value on the data page is measured by JavaScript running on your machine and rendered there. It is never sent anywhere. That includes your fingerprint, your fonts, your hardware, your screen, your preferences and everything you do on the page. Exporting the record writes a file locally; nothing is uploaded.",
    ],
  },
  {
    id: "stored",
    title: "What this site writes to your machine",
    body: [
      "The persistence demonstration writes one random identifier into seven places in your browser at once: a cookie, localStorage, sessionStorage, IndexedDB, the Cache Storage API, a service worker cache and the tab's name. It means nothing outside this site and is tied to no account, no profile and no person.",
      "It exists so the page can show you that clearing one copy does not clear the rest. The Take it back section at the foot of the data page erases all of them and shows you, store by store, what actually went.",
    ],
  },
  {
    id: "kept",
    title: "What the server remembers",
    body: [
      "Two things, because neither demonstration works otherwise. The first is the ETag identifier the server issues and a count of how often your browser hands it back, which is how server-side recognition without cookies is shown at all. The second is which CSS conditions your browser matched, without which the no-JavaScript fingerprint could be described but never demonstrated.",
      "Both are a single entry in a map in the server's memory, capped at five thousand entries, pruned after twenty-four hours, and never written to disk. There is no database. Restarting the server forgets everyone, and it restarts on every deployment.",
    ],
  },
  {
    id: "host",
    title: "What the host sees",
    body: [
      "This site runs on Railway, which terminates TLS and produces ordinary access logs — address, path, timestamp, response code — as any web server does. The application neither reads nor retains them, but they exist, and claiming otherwise would be the kind of vagueness this site was built to argue against.",
    ],
  },
  {
    id: "never",
    title: "What is never done here",
    body: [
      "No analytics of any kind. No advertising or marketing tags. No third-party requests: the frame in the cross-site demonstration is this same server answering on a second hostname. No IP-geolocation lookup — your address is never sent anywhere to be turned into a place. No account, no email, no contact form, no newsletter. The tracker payloads shown on the data page are built in front of you and never sent.",
    ],
  },
  {
    id: "author",
    title: "Who made this, and why",
    body: [
      "Oddur Sigurdsson. It exists to make one argument: a page that asks you for nothing already knows a great deal, and the distance between no permission and one permission is shorter than the prompt suggests. It is not a business, has no funding and no commercial interest, and sells nothing. The source is MIT-licensed and every claim on this page can be checked against it.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main id="main" className="mx-auto max-w-page px-4 pb-major sm:px-6">
      <SiteHeader
        current="none"
        title="What this site does with your data"
        lede="A page about being measured has no business being vague about its own collection. This is all of it: what stays on your machine, what the server keeps, for how long, and what is never done at all."
        note="Everything here is checkable in the source."
      />

      <div className="mt-section max-w-text">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="mt-group first:mt-0">
            <RuleHeading as="h2" className="mb-body">
              {s.title}
            </RuleHeading>
            {s.body.map((p, i) => (
              <p key={i} className="mt-snug text-sm text-ink-muted first:mt-0">
                {p}
              </p>
            ))}
          </section>
        ))}

        <section className="mt-section border-t border-rule pt-body">
          <p className="text-sm text-ink-muted">
            Questions, or something here that does not match what the code does:{" "}
            <a href={`${REPO_URL}/issues`} className="text-ink">
              open an issue
            </a>
            . Last reviewed 13 September 2026.
          </p>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
