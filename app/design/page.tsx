import { SiteHeader } from "@/components/SiteHeader";
import { DesignBar, DesignContents } from "@/components/DesignNav";
import { Icon, type IconName } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import {
  Badge,
  Button,
  Card,
  CodeBlock,
  Disclosure,
  Label,
  Menu,
  MenuItem,
  RuleHeading,
  Table,
  Td,
  Th,
  Tooltip,
} from "@/components/ui";

export const metadata = {
  title: "Design notes",
  description: "The design system behind Session Context: tokens, type, primitives and voice.",
  // Reachable by URL, deliberately absent from the navigation and the sitemap.
  robots: { index: false, follow: false },
};

const INK = [
  { token: "--color-ink", value: "#16160f", use: "Body text, headings, the one strong rule", contrast: "17.7:1" },
  { token: "--color-ink-muted", value: "#605e54", use: "Secondary prose, field names, notes", contrast: "6.3:1" },
  { token: "--color-ink-faint", value: "#76736e", use: "Captions, timings, withheld values", contrast: "4.6:1" },
  { token: "--color-rule-strong", value: "#94918c", use: "Control borders, table head rule", contrast: "3.1:1" },
  { token: "--color-rule", value: "#e4e2da", use: "Row rules, card borders", contrast: "—" },
];

const PAPER = [
  { token: "--color-paper", value: "#fcfcfa", use: "The page" },
  { token: "--color-surface", value: "#ffffff", use: "Cards sitting on the page" },
  { token: "--color-raised", value: "#fafaf7", use: "Panels that should recede slightly" },
  { token: "--color-sunken", value: "#f5f5f1", use: "Code blocks, row hover" },
];

const TYPE = [
  { token: "--text-2xl", px: "26px", use: "Page title", className: "text-2xl font-semibold tracking-tight" },
  { token: "--text-xl", px: "20px", use: "Section heading", className: "text-xl font-semibold tracking-tight" },
  { token: "--text-lg", px: "16px", use: "Finding headline, entry title", className: "text-lg font-medium" },
  { token: "--text-base", px: "14px", use: "Body prose", className: "text-base" },
  { token: "--text-sm", px: "12.5px", use: "Secondary prose, all data values", className: "text-sm" },
  { token: "--text-xs", px: "11.5px", use: "Captions and labels", className: "text-xs" },
];

const ICONS: IconName[] = [
  "server", "fingerprint", "browser", "chip", "sliders", "key", "globe", "eye",
  "shield", "layers", "frame", "broadcast", "thermometer", "megaphone",
  "keyboard", "display", "clock", "database", "code", "send", "info", "check",
  "refresh", "copy", "download", "brush", "book", "pointer", "github",
];

export default function DesignPage() {
  return (
    <main id="main" className="mx-auto max-w-page px-4 pb-24 sm:px-6">
      <SiteHeader
        current="none"
        title="Design notes"
        lede="The system this site is built from: four inks, one typeface pair, hairline rules, and a small set of primitives written by hand rather than installed. Documented here so the next change matches the last one."
        note="Not linked from anywhere. It exists to be checked against."
      />

      <dl className="grid grid-cols-2 gap-y-4 border-b border-rule py-4 sm:grid-cols-4">
        {[
          { label: "Ink values", value: 4 },
          { label: "Type sizes", value: 7 },
          { label: "Primitives", value: 11 },
          { label: "Dependencies", value: "1 icon set" },
        ].map((d, i) => (
          <div key={d.label} className={i > 0 ? "min-w-0 border-l border-rule pl-5" : "min-w-0"}>
            <dt className="text-xs text-ink-faint">{d.label}</dt>
            <dd className="mt-1 text-[1.05rem] font-medium leading-none tracking-[-0.01em] tabular">
              {d.value}
            </dd>
          </div>
        ))}
      </dl>

      <DesignBar />

      <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <DesignContents />

        <div className="min-w-0">
          {/* ── principles ─────────────────────────────────── */}
          <section id="principles" className="mt-12 first:mt-0">
            <RuleHeading as="h2" className="mb-2">
              <Icon name="book" className="size-4 text-ink-faint" />
              Principles
            </RuleHeading>
            <ol className="max-w-[72ch] text-sm leading-relaxed text-ink-muted">
              {[
                ["Monochrome.", "Meaning comes from weight, size and rule, never hue. A page about entropy should not spend attention on decoration."],
                ["Mono is for data.", "Values, field names, URLs and code. Never prose, labels, buttons or tooltips."],
                ["Nothing is filled.", "Controls are hairline outlines or plain text. No solid buttons, no chips, no badges with backgrounds."],
                ["One rule weight per level.", "A single ink hairline under a category; everything else is the light rule."],
                ["Tables never scroll sideways.", "Fixed columns, wrapping cells, and notes that fold under the value on narrow screens."],
                ["Motion explains or does not happen.", "A sweep means work is running; a rise means content resolved. Everything else is still."],
              ].map(([title, body]) => (
                <li key={title} className="border-t border-rule py-3 first:border-t-0 first:pt-0">
                  <span className="font-medium text-ink">{title}</span> {body}
                </li>
              ))}
            </ol>
          </section>

          {/* ── color ──────────────────────────────────────── */}
          <section id="color" className="mt-12">
            <RuleHeading as="h2" className="mb-2">
              <Icon name="brush" className="size-4 text-ink-faint" />
              Ink and paper
            </RuleHeading>
            <p className="mb-5 max-w-[74ch] text-sm leading-relaxed text-ink-muted">
              Four inks and four papers, all warm neutrals. Contrast is measured
              against the page color: body inks clear 4.5:1, and the border ink
              clears the 3:1 required of interactive outlines.
            </p>

            <Label className="mb-2">Ink</Label>
            <Table cols={["12%", "26%", "auto", "14%"]}>
              <thead>
                <tr>
                  <Th>Swatch</Th>
                  <Th>Token</Th>
                  <Th>Used for</Th>
                  <Th>On paper</Th>
                </tr>
              </thead>
              <tbody>
                {INK.map((c) => (
                  <tr key={c.token} className="align-top">
                    <Td>
                      <span
                        className="block h-5 w-full border border-rule"
                        style={{ background: c.value }}
                      />
                    </Td>
                    <Td mono className="text-ink-muted">{c.token}</Td>
                    <Td className="text-sm">{c.use}</Td>
                    <Td mono className="text-sm tabular">{c.contrast}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <Label className="mt-6 mb-2">Paper</Label>
            <Table cols={["12%", "26%", "auto"]}>
              <tbody>
                {PAPER.map((c) => (
                  <tr key={c.token} className="align-top">
                    <Td>
                      <span
                        className="block h-5 w-full border border-rule"
                        style={{ background: c.value }}
                      />
                    </Td>
                    <Td mono className="text-ink-muted">{c.token}</Td>
                    <Td className="text-sm">{c.use}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </section>

          {/* ── type ───────────────────────────────────────── */}
          <section id="type" className="mt-12">
            <RuleHeading as="h2" className="mb-2">Type</RuleHeading>
            <p className="mb-5 max-w-[74ch] text-sm leading-relaxed text-ink-muted">
              The system font stack for everything a person reads, and the
              system monospace for everything a machine produced. No web fonts
              are loaded, which is both a performance decision and a
              fingerprinting one: a custom font would be one more thing to
              measure.
            </p>
            {TYPE.map((t) => (
              <div key={t.token} className="border-t border-rule py-4 first:border-t-0">
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-sm text-ink-muted">{t.token}</span>
                  <span className="font-mono text-sm tabular text-ink-faint">{t.px}</span>
                  <span className="text-sm text-ink-faint">{t.use}</span>
                </div>
                <p className={`mt-2 ${t.className}`}>
                  Everything a single web page can work out about you
                </p>
              </div>
            ))}
            <div className="mt-6">
              <Label className="mb-2">Data, in mono</Label>
              <Table cols={["30%", "auto"]}>
                <tbody>
                  <tr className="align-top">
                    <Td mono className="text-ink-muted">sec-ch-ua-platform-version</Td>
                    <Td mono>&quot;26.5.2&quot;</Td>
                  </tr>
                  <tr className="align-top">
                    <Td mono className="text-ink-muted">canvas 2D hash</Td>
                    <Td mono className="tabular">a6f1c4e0</Td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </section>

          {/* ── rules and spacing ──────────────────────────── */}
          <section id="rules" className="mt-12">
            <RuleHeading as="h2" className="mb-2">Rules and spacing</RuleHeading>
            <p className="mb-5 max-w-[74ch] text-sm leading-relaxed text-ink-muted">
              Three weights, used strictly. A label bound to its content by a
              hairline reads as a heading; the same label floating in equal
              whitespace reads as a fragment, which is why the rule runs to the
              edge.
            </p>
            <div className="max-w-[72ch] space-y-6">
              <div>
                <div className="mb-1.5 h-px w-full bg-ink" />
                <span className="text-sm text-ink-muted">
                  <span className="font-mono">border-ink</span> — one per category, and the masthead
                </span>
              </div>
              <div>
                <div className="mb-1.5 h-px w-full bg-rule-strong" />
                <span className="text-sm text-ink-muted">
                  <span className="font-mono">border-rule-strong</span> — control outlines, table heads
                </span>
              </div>
              <div>
                <div className="mb-1.5 h-px w-full bg-rule" />
                <span className="text-sm text-ink-muted">
                  <span className="font-mono">border-rule</span> — rows, cards, everything else
                </span>
              </div>
              <RuleHeading className="pt-2">A ruled heading, as used throughout</RuleHeading>
            </div>
          </section>

          {/* ── primitives ─────────────────────────────────── */}
          <section id="primitives" className="mt-12">
            <RuleHeading as="h2" className="mb-2">
              <Icon name="layers" className="size-4 text-ink-faint" />
              Primitives
            </RuleHeading>
            <p className="mb-5 max-w-[74ch] text-sm leading-relaxed text-ink-muted">
              Eleven components in one file, written by hand. No component
              library: for a document made of rules and text, a runtime would
              cost more than it returns.
            </p>

            <div className="space-y-8">
              <div>
                <Label className="mb-2">Button — outline and quiet</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Button>
                    <Icon name="refresh" className="size-3.5" />
                    Re-collect
                  </Button>
                  <Button disabled>Disabled</Button>
                  <Button variant="quiet">Quiet</Button>
                </div>
              </div>

              <div>
                <Label className="mb-2">Menu — for actions that belong together</Label>
                <Menu label="Export" align="left">
                  <MenuItem onSelect={() => {}} hint="clipboard">
                    Copy everything as JSON
                  </MenuItem>
                  <MenuItem onSelect={() => {}} hint=".json">
                    Download the whole record
                  </MenuItem>
                </Menu>
              </div>

              <div>
                <Label className="mb-2">Badge — a caption, not a chip</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge>no permission needed</Badge>
                  <Badge tone="outline">constructed here · never sent</Badge>
                </div>
              </div>

              <div>
                <Label className="mb-2">Tooltip — text lives in an attribute, drawn by a pseudo-element</Label>
                <span className="text-sm text-ink-muted">
                  Hover the marker
                  <Tooltip label="Definitions reach assistive technology through aria-label, and are drawn from data-tip, so several hundred of them cost one element each.">
                    <Icon name="info" className="ml-1 size-3 text-ink-faint hover:text-ink" />
                  </Tooltip>
                </span>
              </div>

              <div>
                <Label className="mb-2">Disclosure</Label>
                <Disclosure summary="Show the evidence">
                  <p className="max-w-[70ch] border-t border-rule pt-2 text-sm text-ink-muted">
                    Used wherever a claim should be checkable without the detail
                    crowding the claim.
                  </p>
                </Disclosure>
              </div>

              <div>
                <Label className="mb-2">Card</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Card className="p-4">
                    <h4 className="text-base font-medium">Default</h4>
                    <p className="mt-1 text-sm text-ink-muted">On surface, hairline border.</p>
                  </Card>
                  <Card tone="raised" className="p-4">
                    <h4 className="text-base font-medium">Raised</h4>
                    <p className="mt-1 text-sm text-ink-muted">For panels that should recede.</p>
                  </Card>
                </div>
              </div>

              <div>
                <Label className="mb-2">Code</Label>
                <CodeBlock>{`GET /api/etag\nIf-None-Match: "a00fa3a1-df18-4a0e"\n\n304 Not Modified`}</CodeBlock>
              </div>
            </div>
          </section>

          {/* ── tables ─────────────────────────────────────── */}
          <section id="tables" className="mt-12">
            <RuleHeading as="h2" className="mb-2">Tables</RuleHeading>
            <p className="mb-5 max-w-[74ch] text-sm leading-relaxed text-ink-muted">
              The workhorse. Field names are secondary and values primary, so a
              row reads in one pass. Columns are fixed and every cell wraps —
              nothing scrolls sideways. A withheld value is greyed and named
              rather than left blank.
            </p>
            <Table cols={["27%", "auto", "23%"]}>
              <thead>
                <tr>
                  <Th>Field</Th>
                  <Th>Value</Th>
                  <Th className="hidden sm:table-cell">What it means</Th>
                </tr>
              </thead>
              <tbody>
                <tr className="align-top hover:bg-sunken/70">
                  <Td mono className="text-ink-muted">devicePixelRatio</Td>
                  <Td mono className="tabular">2</Td>
                  <Td className="hidden text-sm text-ink-muted sm:table-cell">
                    Physical pixels per CSS pixel.
                  </Td>
                </tr>
                <tr className="align-top hover:bg-sunken/70">
                  <Td mono className="text-ink-faint">navigator.oscpu</Td>
                  <Td mono>
                    <span className="italic text-ink-faint">not reported</span>
                  </Td>
                  <Td className="hidden text-sm text-ink-faint sm:table-cell">Firefox only.</Td>
                </tr>
              </tbody>
            </Table>
          </section>

          {/* ── motion ─────────────────────────────────────── */}
          <section id="motion" className="mt-12">
            <RuleHeading as="h2" className="mb-2">Motion</RuleHeading>
            <p className="mb-5 max-w-[74ch] text-sm leading-relaxed text-ink-muted">
              Two animations exist. A sweep says work is running and its
              duration is unknown; a rise says content has resolved. Both are
              suppressed entirely under reduced-motion, where the same states
              are shown statically.
            </p>
            <div className="max-w-[72ch] space-y-5">
              <div>
                <span className="text-sm text-ink-muted">sweep — 1.4s, infinite</span>
                <div className="mt-1.5 h-px overflow-hidden bg-rule">
                  <div className="h-px w-1/5 bg-ink animate-[sweep_1.4s_ease-in-out_infinite]" />
                </div>
              </div>
              <div>
                <span className="text-sm text-ink-muted">rise — 260ms, once, staggered by 55ms</span>
                <div className="mt-2 space-y-1.5">
                  {[0, 1, 2].map((i) => (
                    <p
                      key={i}
                      className="text-sm motion-safe:animate-[rise-in_260ms_ease-out]"
                      style={{ animationDelay: `${i * 55}ms` }}
                    >
                      A group of findings resolving into place
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── icons ──────────────────────────────────────── */}
          <section id="icons" className="mt-12">
            <RuleHeading as="h2" className="mb-2">Icons</RuleHeading>
            <p className="mb-5 max-w-[74ch] text-sm leading-relaxed text-ink-muted">
              Lucide at 1.75 stroke, muted, and only where they aid
              orientation: one per category heading, one per meta chip. Never
              repeated down an index. The wordmark carries the fingerprint.
            </p>
            <div className="mb-6 flex items-center gap-3 border-y border-rule py-4">
              <Logo className="h-8 w-auto" />
              <span className="text-[1.9rem] font-semibold leading-none tracking-[-0.025em]">
                Session Context
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
              {ICONS.map((name) => (
                <div key={name} className="flex items-center gap-2 text-sm text-ink-muted">
                  <Icon name={name} className="size-4 text-ink" />
                  <span className="truncate font-mono text-xs">{name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── voice ──────────────────────────────────────── */}
          <section id="voice" className="mt-12">
            <RuleHeading as="h2" className="mb-2">Voice</RuleHeading>
            <div className="max-w-[72ch] text-sm leading-relaxed text-ink-muted">
              {[
                ["Second person, present tense.", "The headline states the fact about the reader; the body names the mechanism."],
                ["No collective “we”.", "The site is not a person. Where an actor is needed, it is “this page”."],
                ["No moralizing.", "State what happens and let it land. The material is alarming enough without adjectives."],
                ["American spelling.", "The APIs are American; mixing registers reads as carelessness."],
                ["Say what is not known.", "A withheld value, a retention limit, a proxy standing in for the browser — each is stated rather than glossed."],
              ].map(([rule, detail]) => (
                <p key={rule} className="border-t border-rule py-3 first:border-t-0 first:pt-0">
                  <span className="font-medium text-ink">{rule}</span> {detail}
                </p>
              ))}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Card className="p-4">
                  <Label className="mb-1">Instead of</Label>
                  <p className="text-sm">“We can estimate how much free disk space you have.”</p>
                </Card>
                <Card className="p-4">
                  <Label className="mb-1">Write</Label>
                  <p className="text-sm text-ink">
                    “This page can estimate how much free disk space you have.”
                  </p>
                </Card>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
