# Session Context

**[sessioncontext.org](https://sessioncontext.org)**

One web page collects everything it can observe about the browser, device and
person that requested it, states each finding in plain English, and shows the
raw values behind it. A second page documents every technique used, how it
works, and where browser defenses currently stand.

The argument it makes is not that any single measurement is alarming. It is
that a page which asks for nothing already knows a great deal — and that the
gap between "no permission" and "one permission" is much smaller than the
prompt implies.

## What it does

- **Findings in plain English.** Around thirty statements about you, ordered by
  how much they give away, each expanding to the exact values it came from.
- **The permission boundary.** Everything above one line on the page needed no
  permission at all. Below it, eight capabilities that do ask — each saying what
  it would reveal *and what the page already worked out without it*. Granting
  one shows the guess against the certainty: 41 fonts inferred by measuring text
  width, against the 383 the operating system actually reports.
- **Persistence, demonstrated.** One identifier written into seven independent
  browser stores plus an eighth the server hides in the HTTP cache as an ETag.
  Clearing one does not clear the rest. The page will erase all eight on request
  and show you, by re-reading each, that exactly one does not go.
- **Fingerprinting without JavaScript.** A stylesheet that loads a different
  image for each condition that is true, so the server learns your color scheme,
  pixel density, input device, accessibility settings and rendering engine with
  scripts blocked or disabled entirely.
- **The complete record.** Forty-odd tables, seven hundred fields, every one
  with its provenance.

## Ethics

These are load-bearing, and the site is specific about them rather than
sweeping — a demonstration of surveillance should not itself be surveillance,
and a vague privacy claim is checkable in this repository in about a minute.

- No analytics, no third-party tags, no IP-geolocation lookup. An address is
  never sent anywhere to be turned into a place.
- Tracker payloads for the major ad platforms are constructed and displayed in
  full, and never sent.
- The "third-party" frame is this same server on a second hostname.
- **What the server does keep**, because two demonstrations cannot work
  otherwise: the ETag identifier with a count of how often your browser returns
  it, and which CSS conditions your browser matched. Both are single entries in
  a bounded in-memory map, capped at 5,000 entries, pruned after 24 hours, never
  written to disk. A restart forgets everyone. Both are disclosed on the page
  where they appear and at `/methods#kept`.
- Four techniques are deliberately **not** implemented and documented as such at
  `/methods#declined`: hidden autofill harvesting, history-sniffing side
  channels, live commercial trackers, and silent cross-site login detection.
- One probe is intrusive — scheme flooding, which can launch desktop
  applications — and runs only behind an explicit in-page confirmation that
  names every scheme it will try.

## Running it

```bash
npm install
npm run dev      # localhost:3939, hot reload
npm start        # production build, same port
npm run probe    # drives headless Chrome and fails on any console error
```

`server.mjs` is a custom Node server rather than `next start`, for one reason:
the page reports connection-level facts the framework cannot see — raw header
order, HTTP version, socket details — which it injects as `x-dm-*` request
headers. It binds both loopback addresses so `localhost` and `127.0.0.1` are
each reachable, which is how the third-party framing demonstration gets a
second origin locally.

## Deploying

Runs anywhere that runs a Node process. It cannot run on a platform that
executes Next.js in its own serverless runtime: the custom server would not
run, and the connection-level facts — the reason it exists — would be gone.

**Run exactly one instance.** The ETag counter and the CSS records live in a
process-local map by design. A second replica means a second map, and the
recognition demonstration starts reporting first visits to returning visitors.
If it needs more capacity, scale the instance up, never out.

## Layout

| Path | Role |
| --- | --- |
| `lib/collect.ts` | Collection, and the passive browser probes |
| `lib/advanced.ts` | Worker cross-check, tamper detection, storage respawn and ETag, benchmarks, the gated probes |
| `lib/gated.ts` | The permission ledger: what each capability reveals, and what the page already knew without it |
| `lib/findings.ts` | Turns collected sections into plain-English findings, each carrying its evidence |
| `lib/methods.ts` | The prose catalogue behind `/methods` |
| `app/globals.css` | The design system: ink, type scale, spacing scale, motion |

`/design` documents the design system and is deliberately unlinked; it exists to
be checked against.

## Who made this

Oddur Sigurdsson. It is not a business, has no funding and no commercial
interest, and sells nothing. What the site stores and what its server keeps for
a day is written out at [sessioncontext.org/privacy](https://sessioncontext.org/privacy),
and every claim there is checkable in this repository.

## License

MIT.
