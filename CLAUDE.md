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
| `lib/advanced.ts` | Worker cross-check, tamper detection, storage respawn + ETag, system UI, benchmarks, cross-tab, thermal, gated probes |
| `lib/libs.ts` | FingerprintJS, ua-parser-js, detectIncognito, privacy-posture probes |
| `lib/findings.ts` | Derives plain-English findings from collected sections; each carries its own evidence |
| `lib/taxonomy.ts` | Six categories → subsections → section ids. Adding a section means adding its id here, or it renders nowhere |
| `lib/glossary.ts` | Regex → definition, matched against field names for tooltips |
| `lib/css-probes.ts` | The CSS-only fingerprint: one rule per condition, each loading a distinct image |
| `lib/methods.ts` | Prose for `/methods` |
| `lib/server-store.ts` | Process-local maps for ETag and CSS-probe records. Never persisted |
| `components/ui.tsx` | All UI primitives. No component library |

Everything client-side flows through `Section[]` (`lib/types.ts`): a section has
an id, title, note and `Row[]` of `{ k, v, n? }`. `v === undefined` renders as
"not reported" and greys the row.

## Conventions

- **Monochrome.** Tokens in `app/globals.css` under `@theme`. No hues — meaning
  comes from weight, size and hairline rules.
- **Mono type is for data only**: values, field names, URLs, code. Never prose,
  labels, buttons or tooltips.
- **No filled controls.** Buttons are hairline outlines or plain text. No black
  fills, no uppercase labels, no letter-spaced eyebrows.
- **One rule weight per level.** A single `border-ink` hairline under category
  headings; `border-rule` everywhere else.
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
stays behind an explicit `confirm()`.

## Verifying changes

`npx tsc --noEmit`, `npx eslint .`, `npx next build`, then drive a real browser —
most of this code does nothing under SSR:

```bash
node scratch/probe.js http://localhost:3939/ 14000   # CDP: console errors + DOM counts
```

Watch for hydration mismatches specifically. Three have been introduced and
fixed here: branching on `location` during render, `Date.now()` inside rendered
payloads, and a StrictMode double-effect that cancelled its own timeout. Use
`useClientValue` (`lib/use-client-value.ts`) for browser-only values rather than
`useState` + effect.
