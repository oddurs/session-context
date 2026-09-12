import type { IconName } from "@/components/Icon";

export type Method = {
  name: string;
  /** what it exposes about a person */
  reveals: string;
  /** how the technique actually works */
  how: string;
  /** where browsers have got to in defending against it */
  status: string;
  /** anchor into the data page, when there is one */
  section?: string;
};

export type MethodGroup = {
  id: string;
  title: string;
  icon: IconName;
  intro: string;
  methods: Method[];
};

export const METHOD_GROUPS: MethodGroup[] = [
  {
    id: "passive",
    title: "Passive — sent before any code runs",
    icon: "server",
    intro:
      "Nothing on this list requires JavaScript, consent, or any action by the visitor. The browser volunteers it as part of asking for the page.",
    methods: [
      {
        name: "Request headers",
        reveals: "Browser and platform, preferred languages in ranked order, compression support, and the page you came from.",
        how: "Every HTTP request carries a header block. The server reads it directly; the page never has to ask for anything.",
        status: "Unchanged and unchangeable — headers are how the web works. The user-agent string itself has been frozen and reduced in Chrome and Safari to limit what it leaks.",
        section: "request-headers",
      },
      {
        name: "Client hints",
        reveals: "Processor architecture and bitness, exact browser build to the patch number, operating system version, device model, color-scheme preference, viewport size.",
        how: "The server replies with an `Accept-CH` header listing what it wants. The browser then attaches those values to every subsequent request. `Critical-CH` makes it retry the very first request so nothing is missed.",
        status: "Actively expanding in Chromium. Presented as a privacy improvement over the user-agent string, because the values are requested rather than broadcast — but a site that asks receives more precise data than the old string ever carried.",
        section: "client-hints",
      },
      {
        name: "Header ordering",
        reveals: "Which browser engine you really are, regardless of what your user-agent string claims.",
        how: "Each engine emits its headers in its own fixed sequence. Reading the raw order requires access below the framework layer, which is why this page runs a custom HTTP server.",
        status: "No mitigation exists or is planned. The same principle applies further down the stack in TLS handshake fingerprinting, which this page does not perform.",
        section: "connection",
      },
      {
        name: "Connection and socket facts",
        reveals: "Protocol version, source address and port, whether the connection was reused.",
        how: "Read straight from the TCP socket carrying the request.",
        status: "Inherent to networking. A VPN or proxy changes the address; it does not remove it.",
        section: "connection",
      },
      {
        name: "CSS-only fingerprinting",
        reveals: "Color scheme, pixel density, window size, input device, accessibility settings, color gamut, and which rendering engine you use — plus whether JavaScript is disabled.",
        how: "A stylesheet declares one rule per condition, each loading a different background image. The browser only fetches an image when its rule matches, so the pattern of requests tells the server which conditions were true. A `@media (scripting: none)` rule fires precisely when scripts are off.",
        status: "No mitigation. Blocking or disabling JavaScript does not affect it, which makes it the standard counter-example to script blocking as a privacy measure.",
        section: "css-noscript",
      },
    ],
  },
  {
    id: "fingerprint",
    title: "Fingerprinting — identity without storage",
    icon: "fingerprint",
    intro:
      "These techniques recognize a returning visitor with nothing saved on their machine. They survive clearing cookies, private windows, and in some cases a change of browser.",
    methods: [
      {
        name: "Canvas rendering",
        reveals: "A stable hash unique to your combination of graphics driver, fonts and rasterizer.",
        how: "The page draws identical text and shapes off-screen and reads the pixels back. Anti-aliasing and font rasterization differ minutely between machines, and the difference is consistent for any one of them.",
        status: "Firefox and Tor Browser randomize or prompt; Safari returns a value that changes per session. Chrome does not mitigate by default.",
        section: "fingerprints",
      },
      {
        name: "WebGL and WebGPU",
        reveals: "The exact GPU model and driver build — effectively the model of computer and its rough price.",
        how: "`WEBGL_debug_renderer_info` returns the unmasked vendor and renderer strings. A rendered scene is also hashed, capturing driver-level differences.",
        status: "Firefox restricts the unmasked strings. Chrome still returns them to any page with no prompt.",
        section: "graphics",
      },
      {
        name: "Audio processing",
        reveals: "A hash reflecting the floating-point behavior of your audio stack.",
        how: "An oscillator is rendered through a compressor in an offline audio context — never audible — and the resulting samples are summed.",
        status: "Randomized in Firefox's resist-fingerprinting mode and in Tor Browser. Otherwise unmitigated.",
        section: "fingerprints",
      },
      {
        name: "Font enumeration by measurement",
        reveals: "Which typefaces are installed, and therefore which software you own.",
        how: "Text is measured in each candidate font against the three generic families. A different width means the font resolved, so it exists.",
        status: "Safari and Firefox limit the visible set to system fonts. No permission is involved anywhere.",
        section: "fonts",
      },
      {
        name: "Composite scoring (FingerprintJS)",
        reveals: "One identifier stable across sessions, combining dozens of individually weak signals.",
        how: "Each signal splits the population; combined, they usually isolate one browser on one machine. The open-source library used here reports its own confidence.",
        status: "A commercial industry. The open version is deliberately public so its accuracy can be audited.",
        section: "visitor-id",
      },
      {
        name: "Engine and maths tells",
        reveals: "The true JavaScript engine, independent of any claimed identity.",
        how: "Error wording, stack formats and floating-point edge cases differ between V8, SpiderMonkey and JavaScriptCore.",
        status: "Not mitigable without breaking the language. Used mainly to catch browsers lying about what they are.",
        section: "engine",
      },
      {
        name: "Worker cross-checking",
        reveals: "Whether values on the main page have been altered by an extension or anti-detect tool.",
        how: "The same properties are read again inside a Web Worker and compared. Spoofing tools frequently patch one context and forget the other.",
        status: "A detection technique rather than a collection one — and a demonstration that hiding can make you more conspicuous.",
        section: "worker",
      },
      {
        name: "Behavioral biometrics",
        reveals: "How you type and move a pointer — usable to tell whether the same human is present.",
        how: "Key hold times, gaps between keystrokes, pointer speed, acceleration and path curvature are collected from ordinary events and compared against a stored profile.",
        status: "In production use for fraud scoring and continuous authentication. No permission prompt exists for it.",
        section: "typing",
      },
      {
        name: "Performance and thermal profiling",
        reveals: "Device class, and whether the machine is throttling, on battery saver or already busy.",
        how: "A fixed benchmark is run several times; absolute speed and the way it degrades are both characteristic.",
        status: "Timer precision has been coarsened across browsers to blunt timing attacks, which limits precision but not device classification.",
        section: "thermal",
      },
    ],
  },
  {
    id: "persistence",
    title: "Persistence — identifiers that come back",
    icon: "layers",
    intro:
      "Storage is not one thing. It is a dozen compartments cleared by different controls, and an identifier only has to survive in one of them to be restored into all the others.",
    methods: [
      {
        name: "Respawning across storage",
        reveals: "That deleting cookies alone does not make you a new person.",
        how: "The same identifier is written to cookies, localStorage, sessionStorage, IndexedDB, Cache Storage, a service worker cache and window.name. On the next visit whichever copy survived repopulates the rest.",
        status: "Browsers have unified 'clear site data' controls, which does clear these together. The technique survives partial clears, which is what most people actually perform.",
        section: "persistence",
      },
      {
        name: "ETag cache identifiers",
        reveals: "A returning visitor even after cookies and site data are cleared.",
        how: "The server labels a response with a unique ETag. The browser caches it and returns it in `If-None-Match` on every revalidation, handing the identifier back without ever storing site data.",
        status: "Mitigated only by clearing or partitioning the HTTP cache. Browsers now partition the cache per site, which stops cross-site use but not recognition by the same site.",
        section: "persistence",
      },
      {
        name: "Service workers",
        reveals: "A store that survives ordinary cookie clearing and runs after the tab is closed.",
        how: "A registered worker keeps its own cache and intercepts network requests for the site.",
        status: "Cleared with site data; otherwise long-lived by design.",
        section: "persistence",
      },
      {
        name: "Cross-tab channels",
        reveals: "How many tabs of a site you have open, and lets state propagate instantly between them.",
        how: "`BroadcastChannel`, `SharedWorker`, Web Locks and storage events all provide same-origin communication between tabs.",
        status: "Working as designed; no mitigation applicable.",
        section: "cross-tab",
      },
    ],
  },
  {
    id: "crosssite",
    title: "Cross-site — how tracking becomes a profile",
    icon: "frame",
    intro:
      "A single site learning about you is one thing. The commercial system depends on the same party appearing on thousands of sites and joining what it sees on each.",
    methods: [
      {
        name: "Third-party embedding",
        reveals: "Whether an embedded party can recognize you from elsewhere, and whether your browser stops it.",
        how: "This page embeds a frame from a genuinely different origin — the same server reached by its other hostname — which then sets and reads its own identifier from inside your visit, exactly as an advertising tag does. No outside company is involved.",
        status: "Third-party cookies are blocked by default in Safari and Firefox and being phased down in Chrome; remaining storage is partitioned per embedding site. This is the most substantial privacy change of the last decade.",
        section: "third-party",
      },
      {
        name: "Analytics and advertising payloads",
        reveals: "Exactly which fields real tags transmit about a visitor.",
        how: "The page constructs the genuine request shapes used by Google Analytics 4, the Meta Pixel and an OpenRTB bid request, filled with the values collected from you — and displays them without sending anything.",
        status: "Ubiquitous. A real-time bidding request is broadcast to hundreds of bidders per ad slot, all of whom receive it whether or not they win.",
        section: "trackers",
      },
      {
        name: "Referrer passing",
        reveals: "Which page you were on immediately before this one.",
        how: "Sent automatically to each site, and to embedded third parties within it.",
        status: "Default referrer policies now trim the value to an origin in most browsers, and this site sets a strict policy of its own.",
        section: "server-derived",
      },
    ],
  },
  {
    id: "environment",
    title: "Environment — the machine and its settings",
    icon: "chip",
    intro:
      "Individually mundane, collectively identifying. Each of these splits the population into groups, and it is the combination that isolates a person.",
    methods: [
      {
        name: "Timezone and locale",
        reveals: "Your approximate region without any location permission, plus your language priorities.",
        how: "`Intl` reports the resolved timezone, calendar, numbering system and locale directly.",
        status: "No permission gate exists. Tor Browser reports UTC to everyone.",
        section: "locale",
      },
      {
        name: "Screen, theme and accessibility preferences",
        reveals: "Display geometry, density, refresh rate, OS accent color, and whether you use reduced motion, increased contrast or forced colors.",
        how: "Media queries and resolved CSS system colors, all readable synchronously.",
        status: "Disclosed by design so pages can adapt. Accessibility settings are effectively health-adjacent data shared with every site, with no way to receive the accommodation while withholding the signal.",
        section: "preferences",
      },
      {
        name: "Hardware reporting",
        reveals: "Processor core count, memory size, touch capability, battery level.",
        how: "Plain properties on `navigator`.",
        status: "Memory is rounded and capped; battery was removed from Firefox and Safari after it was found being used to correlate visitors across sites.",
        section: "hardware",
      },
      {
        name: "Storage quota",
        reveals: "An estimate of your free disk space.",
        how: "`navigator.storage.estimate()` derives its quota from available disk.",
        status: "Deliberately coarsened, but still a personal and slowly-drifting number.",
        section: "storage",
      },
      {
        name: "Codec and DRM support",
        reveals: "Which media formats decode in hardware, which is close to a chipset signature, and which content-protection systems the device carries.",
        how: "`canPlayType`, `MediaSource.isTypeSupported`, `mediaCapabilities.decodingInfo` and Encrypted Media Extensions queries.",
        status: "Required for media playback to work at all; no mitigation proposed.",
        section: "codecs",
      },
      {
        name: "Device counting",
        reveals: "How many cameras, microphones and speakers are attached.",
        how: "`enumerateDevices()` returns entries with blank labels before permission is granted — but the count is visible immediately.",
        status: "Labels and stable IDs are correctly gated behind permission. The count is not.",
        section: "devices",
      },
      {
        name: "Permission state reading",
        reveals: "Which capabilities you have already allowed or denied elsewhere on the site.",
        how: "The Permissions API reports current state without prompting.",
        status: "Intentional, and useful — it also means a site can tell how cautious a user is before asking for anything.",
        section: "permissions",
      },
    ],
  },
  {
    id: "gated",
    title: "Permission-gated — what a prompt unlocks",
    icon: "key",
    intro:
      "These require an explicit approval. They are included to show the size of the step between 'no prompt' and 'one prompt' — and how little the prompt usually explains.",
    methods: [
      {
        name: "Precise location",
        reveals: "Position to within a few meters: a building, not a city.",
        how: "The operating system combines satellite, nearby wi-fi networks and cell towers.",
        status: "Properly gated. Once granted, a site may keep asking on every return visit.",
        section: "geolocation",
      },
      {
        name: "Clipboard reading",
        reveals: "Whatever you last copied — frequently a password, address or private message.",
        how: "`navigator.clipboard.readText()` after approval.",
        status: "Gated, but nothing indicates afterwards that a read occurred.",
        section: "clipboard",
      },
      {
        name: "Full local font list",
        reveals: "Every installed typeface, straight from the operating system — usually unique to a person.",
        how: "`queryLocalFonts()` after approval.",
        status: "Gated in Chromium; not implemented in Firefox or Safari, which regard it as too revealing.",
        section: "local-fonts",
      },
      {
        name: "Multi-screen details",
        reveals: "Every attached display: resolution, arrangement on the desk, manufacturer labels.",
        how: "`getScreenDetails()` after the window-management permission.",
        status: "Gated, and a fair description of a person's workspace.",
        section: "screen-details",
      },
      {
        name: "Idle and lock state",
        reveals: "Whether you are at the keyboard and whether the screen is locked — continuously, in the background.",
        how: "`IdleDetector` after approval.",
        status: "Gated in Chromium; opposed by Mozilla and Apple as surveillance-shaped.",
        section: "idle",
      },
      {
        name: "Camera and microphone identity",
        reveals: "Hardware model names and stable identifiers for every recording device.",
        how: "Granting access once reveals labels and persistent device IDs, along with full track capabilities.",
        status: "Gated. The identifiers persist across visits for the same origin.",
        section: "device-labels",
      },
      {
        name: "Motion sensors",
        reveals: "Accelerometer and gyroscope readings whose calibration noise is unique to the individual handset.",
        how: "Device orientation and motion events, requiring explicit permission on iOS.",
        status: "Gated on mobile. The physical-device fingerprint it carries survives every browser reset.",
        section: "sensors",
      },
      {
        name: "Installed application detection (scheme flooding)",
        reveals: "Which desktop applications you have installed.",
        how: "The browser is asked to open each application's private URL scheme; a hit is inferred from the window losing focus. Kept behind an explicit warning here, because a hit can genuinely launch the application.",
        status: "Repeatedly tightened after public disclosure. Results are heuristic and vary by browser.",
        section: "schemes",
      },
    ],
  },
];

/** Techniques deliberately left out, and why. */
export const DECLINED: { name: string; why: string }[] = [
  {
    name: "Hidden autofill harvesting",
    why: "Invisible form fields that browsers fill with a name, address or card number are a working exploit for extracting personal data, not a demonstration of one. Nothing is learned by building it that this page does not already show.",
  },
  {
    name: "History sniffing side channels",
    why: "Timing and paint-based attacks that recover which sites you have visited are attacks on the browser itself, and current techniques are live vulnerabilities rather than settled behavior.",
  },
  {
    name: "Live commercial trackers",
    why: "Embedding a real analytics or advertising tag would transmit each visitor's data to those companies. This page builds the exact payloads and displays them instead, which teaches the same lesson without the collection.",
  },
  {
    name: "Silent cross-site login detection",
    why: "Probing third-party endpoints to determine which services you are signed in to sends requests carrying your cookies to companies you did not choose to contact during this visit.",
  },
  {
    name: "IP geolocation lookup",
    why: "Turning an address into a city means sending it to a third-party database. Every value on this page is computed locally, and that rule was worth keeping.",
  },
];
