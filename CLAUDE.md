# Session Context — project notes

A privacy demonstration: one page collects everything observable about the
visiting browser, device and session, states it in plain English, and shows the
raw values behind each claim. A second route documents the methods.

## Running it

```bash
npm run dev      # localhost:3939, hot reload, Turbopack
npm start        # production build, same port
npm run build
```

Deployment is Railway, from `main`: the custom server is the reason — no
platform that runs Next.js in its own serverless runtime can report the
connection-level facts below. `/api/health` is the healthcheck, and reports
which commit is live.

**Run exactly one replica.** `lib/server-store.ts` keeps the ETag counter and
the CSS-probe records in a process-local map, deliberately. A second replica is
a second map, and the recognition demonstration starts telling returning
visitors it has never seen them. Under load, scale the instance up, never out.

What that store holds is disclosed on the page itself and at `/methods#kept`.
The site may not make a blanket claim that nothing is transmitted — two
demonstrations need the server to remember something, and the source is one
click from every page.

`server.mjs` is a custom Node server, not `next start`. It exists for one
reason: the page reports connection-level facts the framework cannot see — raw
header order, HTTP version, socket details — which it injects as `x-dm-*`
request headers that `app/page.tsx` reads and filters out of the header table.

It binds **both** loopback addresses on the same port. That is deliberate:
`localhost` and `127.0.0.1` are separate origins to a browser, and the
third-party embedding demonstration frames whichever hostname you are not on.

## Architecture

| Path | Role |
| --- | --- |
| `lib/collect.ts` | Orchestrates collection; the passive browser probes; live interaction counters |
| `lib/gated.ts` | The permission ledger's catalogue: what each capability reveals, what the page already guessed without it, and the resting permission state |
| `lib/advanced.ts` | Worker cross-check, tamper detection, storage respawn + ETag, system UI, benchmarks, cross-tab, thermal, gated probes |
| `lib/libs.ts` | FingerprintJS, ua-parser-js, detectIncognito, privacy-posture probes |
| `lib/findings.ts` | Derives plain-English findings from collected sections; each carries its own evidence |
| `lib/taxonomy.ts` | Six categories → subsections → section ids. Adding a section means adding its id here, or it renders nowhere |
| `lib/glossary.ts` | Regex → definition, matched against field names for tooltips |
| `lib/css-probes.ts` | The CSS-only fingerprint: one rule per condition, each loading a distinct image |
| `lib/methods.ts` | Prose for `/methods` |
| `lib/server-store.ts` | Process-local maps for ETag and CSS-probe records. Never persisted |
| `components/GatedLedger.tsx` | The permission section: one row per capability, its before/after contrast, and the four outcomes |
| `components/ui.tsx` | All UI primitives. No component library |
| `app/globals.css` | The whole design system: ink, type scale, spacing scale, motion. `/design` documents it and must be updated alongside |

Everything client-side flows through `Section[]` (`lib/types.ts`): a section has
an id, title, note and `Row[]` of `{ k, v, n? }`. `v === undefined` renders as
"not reported" and grays the row.

## Conventions

- **Monochrome.** Tokens in `app/globals.css` under `@theme`. No hues — meaning
  comes from weight, size and hairline rules.
- **Mono type is for data only**: values, field names, URLs, code. Never prose,
  labels, buttons or tooltips.
- **No filled controls.** Buttons are hairline outlines or plain text. No black
  fills, no uppercase labels, no letter-spaced eyebrows.
- **Three rule weights, and the axis says the role.** `border-ink` divides
  top-level parts across (masthead, category headings, the permission
  boundary) and marks position or emphasis down (the active rail entry, the
  contrast panel). `border-rule-strong` is the head of a table and the edge of
  anything you can operate. `border-rule` is everything structural inside
  content. `/design` enumerates all six roles; adding a rule means picking one
  of them, not picking a colour.
- **Eight type sizes, eight spacing steps, both in `@theme`.** Never an
  arbitrary `text-[…]` or a raw number for vertical rhythm. Spacing steps are
  named for the relationship they express — `mt-tight` is a heading and its own
  lede, `mb-block` is a heading block and its content, `mt-section` is section
  to section — so two places that mean the same thing cannot drift apart. The
  numeric scale (`py-1`, `px-2.5`) is left for the interior padding of
  controls, where spacing is optical rather than structural.
- **Each size carries its own leading.** `leading-*` in markup means this one
  case genuinely differs; there is currently one, a typing box. Adding a second
  usually means the size is wrong.
- **Tables never scroll sideways.** Fixed `colgroup` widths, everything wraps,
  the note column folds under the value below `sm`.

## Ethics — these are load-bearing

Nothing leaves the machine. No IP-geolocation lookup, no analytics endpoint, no
live third-party tags. Tracker payloads are constructed and displayed, never
sent. The third-party frame is this same server on its other hostname.

Deliberately not implemented, and documented as such on `/methods`: hidden
autofill harvesting, history-sniffing side channels, live commercial trackers,
silent cross-site login detection. Do not add them.

One probe is intrusive (scheme flooding, which can launch desktop apps) and
stays behind an explicit confirmation. That confirmation is in-page, not
`window.confirm()`: it names every scheme it will try before you agree to any
of them, which a native alert cannot do, and it reads on touch.

## Verifying changes

`npx tsc --noEmit`, `npx eslint .`, `npx next build`, then drive a real browser —
most of this code does nothing under SSR:

```bash
npm run probe                      # drives headless Chrome against localhost:3939
npm run probe -- <url> <wait-ms>   # exits non-zero on any console error
```

All three routes are worth driving — `/`, `/methods` and `/design`. CI runs the
same probe against a built server, and after a push to `main` runs it once more
against production, waiting for `/api/health` to report the pushed commit so it
cannot pass against the build it is replacing.

**Firefox and the dev server.** `npm run dev` serves a page that renders and
then never hydrates in Firefox: no build error, no console error, no uncaught
exception, and every chunk loads. Production is unaffected, so check anything
Firefox-related against `npm start`. Ruled out already, each by testing: CSP (a
wide-open dev policy changes nothing), Turbopack (webpack dev fails the same
way), script delivery, and errors of every kind over forty seconds. The cause
is still unknown.

A gated probe must never report a refusal that did not happen. `granted`,
`denied`, `unsupported` and `error` are four different facts about the reader,
and each probe decides between them where its own `try` sits — not by reading
its output back afterwards. Check the unsupported paths in Firefox and Safari,
which implement none of `queryLocalFonts`, `getScreenDetails` or `IdleDetector`.

Watch for hydration mismatches specifically. Three have been introduced and
fixed here: branching on `location` during render, `Date.now()` inside rendered
payloads, and a StrictMode double-effect that canceled its own timeout. Use
`useClientValue` (`lib/use-client-value.ts`) for browser-only values rather than
`useState` + effect.
