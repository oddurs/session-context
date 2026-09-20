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
  { token: "--text-display", px: "30 / 1.0", use: "The wordmark, and nothing else", className: "text-display font-semibold tracking-[-0.025em]" },
  { token: "--text-2xl", px: "26 / 1.22", use: "Page title", className: "text-2xl font-semibold tracking-tight" },
  { token: "--text-xl", px: "20 / 1.3", use: "Section heading", className: "text-xl font-semibold tracking-tight" },
  { token: "--text-lg", px: "16 / 1.4", use: "Finding headline, entry title, stat figure", className: "text-lg font-medium" },
  { token: "--text-base", px: "14 / 1.6", use: "Lede, and prose that carries a section", className: "text-base" },
  { token: "--text-sm", px: "12.5 / 1.6", use: "Body prose, and every data value", className: "text-sm" },
  { token: "--text-xs", px: "11.5 / 1.45", use: "Labels, captions, state text", className: "text-xs" },
  { token: "--text-2xs", px: "10.5 / 1.4", use: "Table micro-caption", className: "text-2xs" },
];

/**
 * Line length, which is the third scale and was the last one written down.
 * Ten different measures were in use and three of them — 70ch, 72ch, 74ch —
 * are the same length to any reader.
 */
const MEASURE = [
  { token: "--container-title", ch: 46, use: "The page title, which should break early" },
  { token: "--container-lede", ch: 58, use: "A headline, or a statement that carries a section" },
  { token: "--container-text", ch: 72, use: "All body prose" },
  { token: "--container-wide", ch: 80, use: "Table notes, and prose set beside data" },
];

/**
 * Three rule weights, and what each one is allowed to divide.
 *
 * Two of these had drifted before this was written down: the masthead drew
 * itself at row weight, so the page had no head, and the permission boundary —
 * the strongest claim on the site — was bracketed in the same hairline used
 * for table rows.
 */
const WEIGHTS = [
  {
    token: "border-ink",
    swatch: "bg-ink",
    across:
      "A division between top-level parts: under the masthead, above each category of data, and bracketing the permission boundary.",
    down: "Where you are — the active entry in a contents rail — and the one passage that carries a section, such as the before/after contrast in the permission ledger.",
  },
  {
    token: "border-rule-strong",
    swatch: "bg-rule-strong",
    across: "The head of a table, which has to read as a head and not as one more row.",
    down: "The edge of anything you can operate: buttons, the menu panel, the checkbox, the typing box. Also the underline beneath links and in-text controls.",
  },
  {
    token: "border-rule",
    swatch: "bg-rule",
    across:
      "Everything structural inside content: table rows, a note set off from the block above it, card edges, and the trailing hairline of a ruled heading.",
    down: "Supporting detail quoted beside the text — the evidence behind a finding, the outcome of a refused prompt.",
  },
];

/**
 * The scale nobody had written down.
 *
 * Named for the relationship each step expresses rather than for its size, so
 * two places that mean the same thing cannot drift apart — which is exactly
 * what had happened: seventeen different top margins, and a heading and its
 * own lede set four different ways in four files.
 */
const SPACE = [
  { token: "--spacing-hair", px: 4, use: "Within one line: a label and its value" },
  { token: "--spacing-tight", px: 6, use: "A heading and the lede belonging to it" },
  { token: "--spacing-snug", px: 10, use: "Paragraphs of a single thought" },
  { token: "--spacing-item", px: 14, use: "One row of a list or table to the next" },
  { token: "--spacing-body", px: 20, use: "A heading block to the body it introduces" },
  { token: "--spacing-group", px: 32, use: "Subsection to subsection" },
  { token: "--spacing-section", px: 56, use: "Section to section" },
  { token: "--spacing-major", px: 80, use: "Top-level region to top-level region" },
];

const ICONS: IconName[] = [
  "server", "fingerprint", "browser", "chip", "sliders", "key", "globe", "eye",
  "shield", "layers", "frame", "broadcast", "thermometer", "megaphone",
  "keyboard", "display", "clock", "database", "code", "send", "info", "check",
  "refresh", "copy", "download", "brush", "book", "pointer", "github",
];

export default function DesignPage() {
  return (
    <main id="main" className="mx-auto max-w-page px-4 pb-major sm:px-6">
      <SiteHeader
        current="none"
        title="Design notes"
        lede="The system this site is built from: four inks, one typeface pair, hairline rules, and a small set of primitives written by hand rather than installed. Documented here so the next change matches the last one."
        note="Not linked from anywhere. It exists to be checked against."
      />

      <dl className="grid grid-cols-2 gap-y-body border-b border-rule py-body sm:grid-cols-4">
        {[
          { label: "Ink values", value: 4 },
          { label: "Type sizes", value: 8 },
          { label: "Spacing steps", value: 8 },
          { label: "Measures", value: 4 },
                  ].map((d, i) => (
          <div key={d.label} className={i > 0 ? "min-w-0 border-l border-rule pl-body" : "min-w-0"}>
            <dt className="text-xs text-ink-faint">{d.label}</dt>
            <dd className="mt-hair text-lg font-medium leading-none tracking-[-0.01em] tabular">
              {d.value}
            </dd>
          </div>
        ))}
      </dl>

      <DesignBar />

      <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-section">
        <DesignContents />

        <div className="min-w-0">
          {/* ── principles ─────────────────────────────────── */}
          <section id="principles" className="mt-section first:mt-0">
            <RuleHeading as="h2" className="mb-tight">
              <Icon name="book" className="size-4 text-ink-faint" />
              Principles
            </RuleHeading>
            <ol className="max-w-text text-sm text-ink-muted">
              {[
                ["Monochrome.", "Meaning comes from weight, size and rule, never hue. A page about entropy should not spend attention on decoration."],
                ["Mono is for data.", "Values, field names, URLs and code. Never prose, labels, buttons or tooltips."],
                ["Nothing is filled.", "Controls are hairline outlines or plain text. No solid buttons, no chips, no badges with backgrounds."],
                ["One rule weight per level.", "A single ink hairline under a category; everything else is the light rule."],
                ["Tables never scroll sideways.", "Fixed columns, wrapping cells, and notes that fold under the value on narrow screens."],
                ["Motion explains or does not happen.", "A sweep means work is running; a rise means content resolved. Everything else is still."],
              ].map(([title, body]) => (
                <li key={title} className="border-t border-rule py-item first:border-t-0 first:pt-0">
                  <span className="font-medium text-ink">{title}</span> {body}
                </li>
              ))}
            </ol>
          </section>

          {/* ── color ──────────────────────────────────────── */}
          <section id="color" className="mt-section">
            <RuleHeading as="h2" className="mb-tight">
              <Icon name="brush" className="size-4 text-ink-faint" />
              Ink and paper
            </RuleHeading>
            <p className="mb-body max-w-text text-sm text-ink-muted">
              Four inks and four papers, all warm neutrals. Contrast is measured
              against the page color: body inks clear 4.5:1, and the border ink
              clears the 3:1 required of interactive outlines.
            </p>

            <Label className="mb-tight">Ink</Label>
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

            <Label className="mt-group mb-tight">Paper</Label>
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
          <section id="type" className="mt-section">
            <RuleHeading as="h2" className="mb-tight">Type</RuleHeading>
            <p className="mb-body max-w-text text-sm text-ink-muted">
              The system font stack for everything a person reads, and the
              system monospace for everything a machine produced. No web fonts
              are loaded, which is both a performance decision and a
              fingerprinting one: a custom font would be one more thing to
              measure.
            </p>
            <p className="mb-body max-w-text text-sm text-ink-muted">
              Eight sizes, each with one job, listed with the leading it
              carries. Nothing may use a size that is not on this list: an
              arbitrary value is a role nobody named, and three of them had
              appeared before this was written down. Because each size carries
              its own leading, markup almost never sets <span className="code">leading-*</span>{" "}
              — one typing box, which wants unusual air, is the only exception.
            </p>
            {TYPE.map((t) => (
              <div key={t.token} className="border-t border-rule py-item first:border-t-0">
                <div className="flex items-baseline gap-body">
                  <span className="font-mono text-sm text-ink-muted">{t.token}</span>
                  <span className="font-mono text-sm tabular text-ink-faint">{t.px}</span>
                  <span className="text-sm text-ink-faint">{t.use}</span>
                </div>
                <p className={`mt-snug ${t.className}`}>
                  Everything a single web page can work out about you
                </p>
              </div>
            ))}
            <div className="mt-group">
              <Label className="mb-tight">Measure</Label>
              <p className="mb-body max-w-wide text-sm text-ink-muted">
                Four line lengths, because a heading and a paragraph should not
                break at the same place. Every block of prose on the site uses
                one of these.
              </p>
              {MEASURE.map((m) => (
                <div key={m.token} className="border-t border-rule py-item first:border-t-0 first:pt-0">
                  <div className="flex items-baseline gap-block">
                    <span className="flex-1 font-mono text-sm text-ink-muted">{m.token}</span>
                    <span className="font-mono text-sm tabular text-ink-faint">{m.ch}ch</span>
                  </div>
                  <p className="mt-tight text-sm text-ink-muted">{m.use}</p>
                  {/*
                    * Drawn at its own width, so the list is checkable by eye —
                    * and clipped rather than scaled where there is no room for
                    * it. Eighty characters is seven hundred pixels, which on a
                    * phone ran past the edge and took the whole page sideways
                    * with it. A measure wider than the window should look like
                    * one; shrinking it to fit would draw all four the same
                    * length and say something false about every one of them.
                    */}
                  <div aria-hidden className="mt-tight overflow-hidden">
                    <div className="h-px bg-rule" style={{ width: `${m.ch}ch` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-group">
              <Label className="mb-tight">Data, in mono</Label>
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
          <section id="rules" className="mt-section">
            <RuleHeading as="h2" className="mb-tight">Rules and spacing</RuleHeading>
            <p className="mb-body max-w-text text-sm text-ink-muted">
              Three weights, and the axis says the role. A horizontal rule
              divides the document; a vertical one marks a passage inside it.
              A label bound to its content by a hairline reads as a heading,
              where the same label floating in equal whitespace reads as a
              fragment — which is why the rule runs to the edge.
            </p>
            <div className="max-w-text">
              {WEIGHTS.map((w) => (
                // The swatch is the divider: a separate border above it put two
                // hairlines ten pixels apart, which reads as one doubled rule
                // rather than as a specimen and a separation.
                <div key={w.token} className="pb-item pt-tight first:pt-0">
                  <div className={`mb-snug h-px w-full ${w.swatch}`} />
                  <span className="code text-ink">{w.token}</span>
                  <dl className="mt-tight grid gap-x-group gap-y-hair sm:grid-cols-[5.5rem_minmax(0,1fr)]">
                    <dt className="text-sm text-ink-faint">Across</dt>
                    <dd className="text-sm text-ink-muted">{w.across}</dd>
                    <dt className="text-sm text-ink-faint">Down</dt>
                    <dd className="text-sm text-ink-muted">{w.down}</dd>
                  </dl>
                </div>
              ))}
            </div>
            <div className="mt-body max-w-text">
              <RuleHeading>A ruled heading, as used throughout</RuleHeading>
            </div>

            <p className="mt-group mb-body max-w-text text-sm text-ink-muted">
              Vertical rhythm runs on eight steps, each named for the
              relationship it expresses rather than for its size. Every gap
              between blocks comes from this list; the raw numeric scale is
              left for the interior padding of controls, where the spacing is
              optical rather than structural. Each step is at least 1.4x the
              one below it, which is where a gap starts reading as deliberate
              instead of as a rounding error.
            </p>
            <div className="max-w-text">
              {SPACE.map((sp) => (
                <div key={sp.token} className="border-t border-rule py-item first:border-t-0 first:pt-0">
                  <div className="flex items-baseline gap-body">
                    <span className="flex-1 font-mono text-sm text-ink-muted">{sp.token}</span>
                    <span className="font-mono text-sm tabular text-ink-faint">{sp.px}px</span>
                  </div>
                  <p className="mt-tight text-sm text-ink-muted">{sp.use}</p>
                  {/* The step drawn at its own size, so the list is checkable
                      by eye rather than only by arithmetic. */}
                  <div
                    aria-hidden
                    className="mt-tight border-l border-ink bg-sunken"
                    style={{ height: `${sp.px}px` }}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* ── primitives ─────────────────────────────────── */}
          <section id="primitives" className="mt-section">
            <RuleHeading as="h2" className="mb-tight">
              <Icon name="layers" className="size-4 text-ink-faint" />
              Primitives
            </RuleHeading>
            <p className="mb-body max-w-text text-sm text-ink-muted">
              Eleven components in one file, written by hand. No component
              library: for a document made of rules and text, a runtime would
              cost more than it returns.
            </p>

            <div className="space-y-group">
              <div>
                <Label className="mb-tight">Button — outline and quiet</Label>
                <div className="flex flex-wrap items-center gap-tight">
                  <Button>
                    <Icon name="refresh" className="size-3.5" />
                    Re-collect
                  </Button>
                  <Button disabled>Disabled</Button>
                  <Button variant="quiet">Quiet</Button>
                </div>
              </div>

              <div>
                <Label className="mb-tight">Menu — for actions that belong together</Label>
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
                <Label className="mb-tight">Badge — a caption, not a chip</Label>
                <div className="flex flex-wrap items-center gap-snug">
                  <Badge>no permission needed</Badge>
                  <Badge tone="outline">constructed here · never sent</Badge>
                </div>
              </div>

              <div>
                <Label className="mb-tight">Tooltip — one shared panel, positioned against the viewport</Label>
                <span className="text-sm text-ink-muted">
                  Hover the marker
                  <Tooltip label="One fixed panel serves every trigger on the page, so nothing can clip it: it measures itself, flips above the trigger when there is no room below, and clamps to the window. The text reaches assistive technology through the trigger's own aria-label.">
                    <Icon name="info" className="ml-1 size-3 text-ink-faint hover:text-ink" />
                  </Tooltip>
                </span>
              </div>

              <div>
                <Label className="mb-tight">Disclosure</Label>
                <Disclosure summary="Show the evidence">
                  <p className="max-w-text border-t border-rule pt-tight text-sm text-ink-muted">
                    Used wherever a claim should be checkable without the detail
                    crowding the claim.
                  </p>
                </Disclosure>
              </div>

              <div>
                <Label className="mb-tight">Card</Label>
                <div className="grid gap-snug sm:grid-cols-2">
                  <Card className="p-4">
                    <h4 className="text-base font-medium">Default</h4>
                    <p className="mt-hair text-sm text-ink-muted">On surface, hairline border.</p>
                  </Card>
                  <Card tone="raised" className="p-4">
                    <h4 className="text-base font-medium">Raised</h4>
                    <p className="mt-hair text-sm text-ink-muted">For panels that should recede.</p>
                  </Card>
                </div>
              </div>

              <div>
                <Label className="mb-tight">Code</Label>
                <CodeBlock>{`GET /api/etag\nIf-None-Match: "a00fa3a1-df18-4a0e"\n\n304 Not Modified`}</CodeBlock>
              </div>
            </div>
          </section>

          {/* ── tables ─────────────────────────────────────── */}
          <section id="tables" className="mt-section">
            <RuleHeading as="h2" className="mb-tight">Tables</RuleHeading>
            <p className="mb-body max-w-text text-sm text-ink-muted">
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
          <section id="motion" className="mt-section">
            <RuleHeading as="h2" className="mb-tight">Motion</RuleHeading>
            <p className="mb-body max-w-text text-sm text-ink-muted">
              Three animations exist. A sweep says work is running and its
              duration is unknown; a rise says content has resolved; a breath
              marks a table whose values are still changing as you read. All
              three are suppressed under reduced-motion, where the same states
              are shown statically.
            </p>
            <div className="max-w-text space-y-body">
              <div>
                <span className="text-sm text-ink-muted">sweep — 1.4s, infinite</span>
                <div className="mt-tight h-px overflow-hidden bg-rule">
                  <div className="h-px w-1/5 bg-ink animate-[sweep_1.4s_ease-in-out_infinite]" />
                </div>
              </div>
              <div>
                <span className="text-sm text-ink-muted">breathe — 2.8s, infinite</span>
                <div className="mt-tight flex items-center gap-hair text-xs text-ink-faint">
                  <span
                    aria-hidden
                    className="size-1 shrink-0 rounded-full bg-ink-faint
                               motion-safe:animate-[breathe_2.8s_ease-in-out_infinite]"
                  />
                  live
                </div>
              </div>
              <div>
                <span className="text-sm text-ink-muted">rise — 260ms, once, staggered by 55ms</span>
                <div className="mt-tight space-y-tight">
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
          <section id="icons" className="mt-section">
            <RuleHeading as="h2" className="mb-tight">Icons</RuleHeading>
            <p className="mb-body max-w-text text-sm text-ink-muted">
              Lucide at 1.75 stroke, muted, and only where they aid
              orientation: one per category heading, one per meta chip. Never
              repeated down an index. The wordmark carries the fingerprint.
            </p>
            <div className="mb-body flex items-center gap-snug border-y border-rule py-body">
              <Logo className="h-8 w-auto" />
              <span className="text-display font-semibold tracking-[-0.025em]">
                Session Context
              </span>
            </div>
            <div className="grid grid-cols-3 gap-snug sm:grid-cols-5 lg:grid-cols-6">
              {ICONS.map((name) => (
                <div key={name} className="flex items-center gap-tight text-sm text-ink-muted">
                  <Icon name={name} className="size-4 text-ink" />
                  <span className="truncate font-mono text-xs">{name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── voice ──────────────────────────────────────── */}
          <section id="voice" className="mt-section">
            <RuleHeading as="h2" className="mb-tight">Voice</RuleHeading>
            <div className="max-w-text text-sm text-ink-muted">
              {[
                ["Second person, present tense.", "The headline states the fact about the reader; the body names the mechanism."],
                ["No collective “we”.", "The site is not a person. Where an actor is needed, it is “this page”."],
                ["No moralizing.", "State what happens and let it land. The material is alarming enough without adjectives."],
                ["American spelling.", "The APIs are American; mixing registers reads as carelessness."],
                ["Say what is not known.", "A withheld value, a retention limit, a proxy standing in for the browser — each is stated rather than glossed."],
              ].map(([rule, detail]) => (
                <p key={rule} className="border-t border-rule py-item first:border-t-0 first:pt-0">
                  <span className="font-medium text-ink">{rule}</span> {detail}
                </p>
              ))}
              <div className="mt-body grid gap-snug sm:grid-cols-2">
                <Card className="p-4">
                  <Label className="mb-tight">Instead of</Label>
                  <p className="text-sm">“We can estimate how much free disk space you have.”</p>
                </Card>
                <Card className="p-4">
                  <Label className="mb-tight">Write</Label>
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
