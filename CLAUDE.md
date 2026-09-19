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

It binds one **dual-stack** socket on `::`, so `localhost` and `127.0.0.1` are
both reachable. That is deliberate: they are separate origins to a browser, and
the third-party embedding demonstration frames whichever hostname you are not
on. Locally the server drops any peer that is not loopback, so `::` does not
mean the laptop's network. Binding the two addresses as two listeners instead
is what caused the Firefox dev-server bug described below — don't go back to
it.

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
npm run probe                      # headless Chrome, over DevTools Protocol
npm run probe:firefox              # headless Firefox, over WebDriver BiDi
npm run probe:safari               # real Safari, over WebDriver
npm run probe -- <url> <wait-ms>   # any of the three; non-zero on a problem
```

All three ask the page the same questions — `scripts/lib/assertions.mjs` holds
them, and each driver only supplies the protocol. **Use more than Chrome.**
Every browser-specific failure this project has had was invisible in Chrome and
plain in one of the other two, including the one below, which took months.
Firefox needs nothing installed; Safari needs `safaridriver --enable` once and
Develop → Allow Remote Automation, and opens a real window.

All three routes are worth driving — `/`, `/methods` and `/design`. CI runs the
same probe against a built server, and after a push to `main` runs it once more
against production, waiting for `/api/health` to report the pushed commit so it
cannot pass against the build it is replacing.

**Firefox and the dev server**, since it may look like it is coming back: the
page rendered and then never hydrated in Firefox, with no build error, no
console error and every chunk loading. The cause was two listeners. Next's dev
server serves its hot-reload websocket from only one of them and the other
accepts the upgrade and answers nothing; Firefox resolves `localhost` to
127.0.0.1 first while Chrome reaches for `::1`, so Chrome got the live socket
and Firefox got the dead one, and the dev client waits on it before hydrating.
One dual-stack listener fixed it. `allowedDevOrigins` in `next.config.ts` is
the other half: Next's dev server 403s the hot-reload socket of any origin but
`localhost`, which silently broke the embedded frame the same way.

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
