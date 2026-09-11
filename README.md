# Session Context

A single web page that collects everything it can observe about the browser,
device and person that requested it — then explains each finding in plain
English and shows the exact values behind it.

Built as a privacy demonstration: every technique here is one that ordinary
websites use, and almost all of them run without a permission prompt.

## What it does

Two views, plus a methods reference:

- **Findings** — ~28 plain-English statements ("You are using a Mac with an
  Apple M5 Pro chip", "There is an identifier hidden in your browser cache"),
  each expandable to the fields it was derived from.
- **Everything** — ~40 tables, ~800 fields, grouped into six categories with a
  glossary tooltip on every jargon term and anything unreported greyed out.
- **Methods** — what each of the 36 techniques exposes, how it works, and where
  browser defences currently stand.

## Techniques

Passive (no JavaScript required): request headers, client hints via `Accept-CH`,
raw header ordering, socket-level facts, and **CSS-only fingerprinting** — one
style rule per condition, each loading a distinct image, including a rule that
fires when scripting is disabled.

Fingerprinting: canvas, WebGL/WebGPU, audio DSP, font metrics, engine tells,
FingerprintJS composite scoring, Web Worker cross-checking, keystroke and
pointer biometrics, sustained-performance profiling.

Persistence: one identifier written to seven stores at once (cookies,
localStorage, sessionStorage, IndexedDB, Cache Storage, a service worker,
`window.name`) and respawned from whichever survives — plus an **ETag
supercookie** that lives in the HTTP cache, not in site data.

Cross-site: a genuine third-party frame (the same server on its other hostname,
so no outside company is involved) demonstrating storage partitioning, and the
real GA4, Meta Pixel and OpenRTB payloads constructed from your data and
displayed without being sent.

Permission-gated: precise location, clipboard contents, the full local font
list, all attached displays, idle and lock state, camera/microphone identity,
motion sensors, and installed-application detection behind an explicit warning.

## What it deliberately does not do

No data leaves the machine. No IP-geolocation lookup, no analytics endpoint, no
live commercial trackers. Hidden autofill harvesting, history-sniffing side
channels and silent cross-site login detection were left out on purpose; the
Methods page states why for each.

## Running it

```bash
npm install
npm run build
npm start          # production, Turbopack, random port
npm run dev        # development
```

The custom server (`server.mjs`) exists so the page can report connection-level
facts that a framework cannot see — raw header order, HTTP version, socket
details — which it injects as `x-dm-*` request headers.

Open it on `127.0.0.1` or `localhost`: the third-party embedding demonstration
needs both hostnames to exist, and uses the other one as its cross-origin frame.

## Stack

Next.js 16 (App Router, Turbopack), React 19, Tailwind v4 with a hand-written
token layer and local UI primitives — no component runtime. FingerprintJS,
ua-parser-js and detectIncognito alongside direct platform probes.
