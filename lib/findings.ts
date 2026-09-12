import type { Section } from "./types";

/**
 * A plain-English statement about the visitor, backed by the exact fields it
 * was derived from. This is the layer people actually read; the raw tables
 * below the fold are the receipts.
 */
export type Finding = {
  id: string;
  group: string;
  /** second-person headline, no jargon */
  headline: string;
  /** what it means and why it matters, one or two sentences */
  detail: string;
  /** how the page got it */
  how: "Sent automatically" | "Read by script" | "You granted this";
  /** the fields this was derived from */
  evidence: { k: string; v: unknown }[];
  /** raw section to jump to */
  sectionId: string;
};

type Index = Map<string, Map<string, unknown>>;

function index(sections: Section[]): Index {
  const m: Index = new Map();
  for (const s of sections) {
    const rows = new Map<string, unknown>();
    for (const r of s.rows) rows.set(r.k, r.v);
    m.set(s.id, rows);
  }
  return m;
}

const str = (v: unknown) => (v == null ? undefined : String(v));

/** "1 camera" / "3 cameras" */
const plural = (count: unknown, noun: string) =>
  `${count} ${noun}${Number(count) === 1 ? "" : "s"}`;

/** True when a value is present and not one of our "nothing here" markers. */
function has(v: unknown): boolean {
  if (v == null || v === "") return false;
  const s = String(v);
  return !(
    s.startsWith("error:") ||
    s === "unsupported" ||
    s === "not set" ||
    s === "none" ||
    s === "absent" ||
    s === "unknown" ||
    s === "timed out" ||
    s === "n/a"
  );
}

export const FINDING_GROUPS = [
  "Who you are",
  "Where you are",
  "The machine in front of you",
  "Your browser and settings",
  "What you did on this page",
  "What you handed over",
];

export function deriveFindings(sections: Section[]): Finding[] {
  const ix = index(sections);
  const g = (sec: string, key: string) => ix.get(sec)?.get(key);
  const out: Finding[] = [];

  /** Add a finding when its evidence actually exists. */
  const add = (
    f: Omit<Finding, "evidence"> & { evidence: [string, string][] },
    require: unknown[] = []
  ) => {
    if (require.length && !require.every(has)) return;
    const evidence = f.evidence
      .map(([sec, key]) => ({ k: key, v: g(sec, key) }))
      .filter((e) => e.v !== undefined);
    if (!evidence.length) return;
    out.push({ ...f, evidence });
  };

  /* ── who you are ───────────────────────────────────────────── */

  const visitorId = g("visitor-id", "visitorId");
  add(
    {
      id: "f-visitor",
      group: "Who you are",
      headline: `This browser has a fingerprint: ${String(visitorId ?? "").slice(0, 12)}…`,
      detail:
        "Dozens of unremarkable details — graphics card, fonts, audio hardware, screen — combine into one number that is very likely unique to this browser on this machine. No cookie is involved, so clearing cookies does not change it. It is recomputed from scratch on every visit.",
      how: "Read by script",
      sectionId: "visitor-id",
      evidence: [
        ["visitor-id", "visitorId"],
        ["visitor-id", "confidence.score"],
        ["visitor-id", "components collected"],
      ],
    },
    [visitorId]
  );

  const status = g("persistence", "status");
  const visits = g("persistence", "visit count");
  const recovered = g("persistence", "recovered from");
  if (has(status)) {
    const returning = String(status).startsWith("recovered");
    add({
      id: "f-persistence",
      group: "Who you are",
      headline: returning
        ? Number(visits) > 1
          ? `You have been here before: this is visit number ${visits}.`
          : "You have been here before, and this page just proved it."
        : "You have just been tagged. Come back and this page will know you.",
      detail: returning
        ? `An identifier stored on your last visit came back from: ${recovered}. It is written to seven places at once, so clearing only cookies would not have erased it: any surviving copy quietly restores the rest. The technique is known as a respawning, or zombie, cookie.`
        : "One identifier was just written to seven separate stores in your browser: cookies, local storage, session storage, a database, the cache, a service worker and the tab name. On your next visit, whichever copy survives restores the rest.",
      how: "Read by script",
      sectionId: "persistence",
      evidence: [
        ["persistence", "assigned identifier"],
        ["persistence", "recovered from"],
        ["persistence", "visit count"],
        ["persistence", "first seen"],
      ],
    });
  }

  const incognito = g("privacy", "private/incognito mode");
  if (incognito === true) {
    add({
      id: "f-incognito",
      group: "Who you are",
      headline: "You are in a private window, and it shows.",
      detail:
        "Private browsing hides your history from other people using this computer. It does not hide you from the site: the storage restrictions it imposes are themselves detectable, and everything else on this page still works.",
      how: "Read by script",
      sectionId: "privacy",
      evidence: [["privacy", "private/incognito mode"], ["privacy", "browser identified as"]],
    });
  }

  const canvasHash = g("fingerprints", "canvas 2D hash");
  add(
    {
      id: "f-canvas",
      group: "Who you are",
      headline: "The way your machine draws a picture identifies it.",
      detail:
        "This page drew the same small image and played the same silent tone it gives every visitor. Small differences in graphics driver, fonts and audio hardware change the result in ways you cannot see, yet stay perfectly consistent for your machine and are rare across the population.",
      how: "Read by script",
      sectionId: "fingerprints",
      evidence: [
        ["fingerprints", "canvas 2D hash"],
        ["fingerprints", "WebGL render hash"],
        ["fingerprints", "audio DSP hash"],
        ["fingerprints", "installed-font hash"],
      ],
    },
    [canvasHash]
  );

  /* ── where you are ─────────────────────────────────────────── */

  const tz = g("locale", "Intl timeZone");
  add(
    {
      id: "f-timezone",
      group: "Where you are",
      headline: `Your clock says you are in ${tz}.`,
      detail:
        "Timezone is handed over with no location permission, and narrows you to a region immediately. With your language settings alongside it, a country and often a city follow on the first visit.",
      how: "Read by script",
      sectionId: "locale",
      evidence: [
        ["locale", "Intl timeZone"],
        ["locale", "getTimezoneOffset()"],
        ["locale", "observes DST"],
        ["locale", "client clock (local)"],
      ],
    },
    [tz]
  );

  const langs = g("navigator", "languages");
  const languageNames = (() => {
    if (!has(langs)) return undefined;
    try {
      const dn = new Intl.DisplayNames(undefined, { type: "language" });
      const tags = String(langs).split(", ");
      const names = tags.map((tag) => dn.of(tag) ?? tag);
      // "en-US, en" resolves to "American English, English"; keep the most
      // specific name and say how many the browser lists.
      const primary = names[0];
      return tags.length > 1 ? `${primary}, and ${tags.length - 1} more in order` : primary;
    } catch {
      return String(langs);
    }
  })();
  add(
    {
      id: "f-language",
      group: "Where you are",
      headline: `You read ${languageNames}.`,
      detail:
        "Browsers send a ranked list of your preferred languages on every request. The order is personal: a second or third language often says where you are from, or where you have lived.",
      how: "Sent automatically",
      sectionId: "server-derived",
      evidence: [
        ["navigator", "languages"],
        ["server-derived", "Accept-Language (raw)"],
        ["server-derived", "language count"],
      ],
    },
    [langs]
  );

  const ip = g("server-derived", "client IP (x-forwarded-for)");
  add(
    {
      id: "f-ip",
      group: "Where you are",
      headline: "Your network address is visible to every site you open.",
      detail:
        "On a public site this address is matched against a commercial database and becomes a city, an internet provider, often an employer. This copy runs on your own machine, so the address below is your loopback; on the open web it would be the real one. No permission is ever requested for it.",
      how: "Sent automatically",
      sectionId: "server-derived",
      evidence: [
        ["server-derived", "client IP (x-forwarded-for)"],
        ["connection", "remote address"],
        ["connection", "remote port"],
      ],
    },
    [ip]
  );

  const rtt = g("network", "connection.rtt");
  add(
    {
      id: "f-network",
      group: "Where you are",
      headline: "The quality of your connection is visible.",
      detail:
        "Round-trip time and bandwidth are reported to any page that asks, and hint at whether you are on home broadband, an office network, mobile data, or a train.",
      how: "Read by script",
      sectionId: "network",
      evidence: [
        ["network", "connection.effectiveType"],
        ["network", "connection.downlink"],
        ["network", "connection.rtt"],
        ["network", "connection.saveData"],
      ],
    },
    [rtt]
  );

  /* ── the machine ───────────────────────────────────────────── */

  const gpu = g("graphics", "WebGL 1 · UNMASKED_RENDERER") ?? g("graphics", "WebGL 2 · UNMASKED_RENDERER");
  if (has(gpu)) {
    const chip = /Apple (M\d+[^,)]*)/.exec(String(gpu))?.[1];
    add({
      id: "f-gpu",
      group: "The machine in front of you",
      headline: chip
        ? `You are using a Mac with an Apple ${chip.trim()} chip.`
        : "The exact graphics chip in this computer is readable.",
      detail:
        "The graphics driver gives its full name to any page that asks, with no prompt. It names the chip and driver build, which narrows you to a model of computer and roughly what it cost.",
      how: "Read by script",
      sectionId: "graphics",
      evidence: [
        ["graphics", "WebGL 1 · UNMASKED_VENDOR"],
        ["graphics", "WebGL 1 · UNMASKED_RENDERER"],
        ["graphics", "WebGPU · vendor"],
        ["graphics", "WebGPU · architecture"],
      ],
    });
  }

  const cores = g("navigator", "hardwareConcurrency");
  add(
    {
      id: "f-cpu",
      group: "The machine in front of you",
      headline: `Your computer has ${cores} processor cores.`,
      detail:
        "Core count, memory size and the time taken on a small benchmark separate an expensive workstation from a cheap laptop or an old phone. Advertisers treat that as a proxy for income.",
      how: "Read by script",
      sectionId: "benchmark",
      evidence: [
        ["navigator", "hardwareConcurrency"],
        ["navigator", "deviceMemory"],
        ["benchmark", "float math (9M ops)"],
        ["benchmark", "composite score"],
      ],
    },
    [cores]
  );

  const sw = g("screen", "screen.width");
  const sh = g("screen", "screen.height");
  const dpr = g("screen", "devicePixelRatio");
  add(
    {
      id: "f-screen",
      group: "The machine in front of you",
      headline: `Your screen is ${sw} × ${sh}, at ${dpr}× pixel density.`,
      detail:
        "The size of the window you opened is visible too, which says whether the browser is full screen. The gap between window and screen says whether developer tools are open.",
      how: "Read by script",
      sectionId: "screen",
      evidence: [
        ["screen", "screen.width"],
        ["screen", "screen.height"],
        ["screen", "devicePixelRatio"],
        ["screen", "window.innerWidth"],
        ["screen", "window.innerHeight"],
        ["screen", "chrome height (outer-inner)"],
        ["system-ui", "display refresh rate"],
      ],
    },
    [sw]
  );

  const battery = g("hardware", "battery.level");
  add(
    {
      id: "f-battery",
      group: "The machine in front of you",
      headline: `Your battery is at ${battery}${g("hardware", "battery.charging") === true ? " and charging" : ""}.`,
      detail:
        "Battery level was once readable by any page. It shows whether you are plugged in, and a level falling across several sites is a short-lived way to follow one person between them. Firefox and Safari removed it for that reason.",
      how: "Read by script",
      sectionId: "hardware",
      evidence: [
        ["hardware", "battery.level"],
        ["hardware", "battery.charging"],
        ["hardware", "battery.dischargingTime"],
      ],
    },
    [battery]
  );

  const quota = g("storage", "storage.quota");
  add(
    {
      id: "f-disk",
      group: "The machine in front of you",
      headline: "Your free disk space can be estimated from here.",
      detail:
        "The browser tells any page how much data it will store, and calculates that from free disk space. The number is personal, and drifts slowly enough to help recognize you later.",
      how: "Read by script",
      sectionId: "storage",
      evidence: [
        ["storage", "storage.quota"],
        ["storage", "storage.usage"],
      ],
    },
    [quota]
  );

  const fonts = g("fonts", "fonts detected");
  add(
    {
      id: "f-fonts",
      group: "The machine in front of you",
      headline: `${fonts} of the fonts this page tested for are installed on your system.`,
      detail:
        "No permission was asked. Text was drawn off-screen and measured. Installed fonts follow the software you use, so the set is close to a list of what you have installed.",
      how: "Read by script",
      sectionId: "fonts",
      evidence: [
        ["fonts", "fonts detected"],
        ["fonts", "detected list"],
      ],
    },
    [fonts]
  );

  const cams = g("devices", "videoinput");
  add(
    {
      id: "f-devices",
      group: "The machine in front of you",
      headline: `Your recording hardware is countable: ${plural(cams, "camera")}, ${plural(g("devices", "audioinput"), "microphone")}, ${plural(g("devices", "audiooutput"), "speaker")}.`,
      detail:
        "Counting needs no permission. Names and serial numbers stay hidden until you grant camera or microphone access, but the count alone separates a laptop from a desk setup with a webcam and headset.",
      how: "Read by script",
      sectionId: "devices",
      evidence: [
        ["devices", "devices total"],
        ["devices", "videoinput"],
        ["devices", "audioinput"],
        ["devices", "audiooutput"],
      ],
    },
    [cams]
  );

  /* ── browser and settings ──────────────────────────────────── */

  const bname = g("ua-parsed", "browser.name");
  const bver = g("client-hints", "sec-ch-ua-full-version") ?? g("ua-parsed", "browser.version");
  const osname = g("ua-parsed", "os.name");
  const osver = g("client-hints", "sec-ch-ua-platform-version") ?? g("ua-parsed", "os.version");
  add(
    {
      id: "f-browser",
      group: "Your browser and settings",
      headline: `You are running ${bname} ${String(bver).replace(/"/g, "")} on ${osname} ${String(osver).replace(/"/g, "")}.`,
      detail:
        "Not just the browser: the exact build, down to the patch. It is volunteered on every request before any script runs, along with your processor architecture. A version left un-updated also says which security holes remain open.",
      how: "Sent automatically",
      sectionId: "client-hints",
      evidence: [
        ["client-hints", "sec-ch-ua-full-version-list"],
        ["client-hints", "sec-ch-ua-platform-version"],
        ["client-hints", "sec-ch-ua-arch"],
        ["client-hints", "sec-ch-ua-bitness"],
        ["ua-parsed", "engine.name"],
      ],
    },
    [bname]
  );

  const headerOrder = g("connection", "raw header order");
  add(
    {
      id: "f-headers",
      group: "Your browser and settings",
      headline: "Even if you faked your browser identity, the giveaway is the order.",
      detail:
        "Every browser sends its request headers in its own fixed order. Changing the user-agent string does not change that order, so a site can tell what you really are regardless of what you claim. The same holds at the network layer below this one.",
      how: "Sent automatically",
      sectionId: "connection",
      evidence: [
        ["connection", "raw header order"],
        ["connection", "header count"],
        ["connection", "HTTP version"],
      ],
    },
    [headerOrder]
  );

  const scheme = g("preferences", "prefers-color-scheme");
  add(
    {
      id: "f-scheme",
      group: "Your browser and settings",
      headline: `Your system is set to ${scheme} mode.`,
      detail:
        "Your operating system's theme, accent color and text size all reach the page. Each is a small detail, but each splits the population into groups, and the combination is what identifies you.",
      how: "Read by script",
      sectionId: "preferences",
      evidence: [
        ["preferences", "prefers-color-scheme"],
        ["system-ui", "system color · AccentColor"],
        ["system-ui", "default font size"],
        ["system-ui", "scrollbar width"],
      ],
    },
    [scheme]
  );

  const motion = str(g("preferences", "prefers-reduced-motion"));
  const contrast = str(g("preferences", "prefers-contrast"));
  const forced = str(g("preferences", "forced-colors"));
  const a11yOn = motion === "reduce" || contrast === "more" || forced === "active";
  if (has(motion)) {
    add({
      id: "f-a11y",
      group: "Your browser and settings",
      headline: a11yOn
        ? "Your accessibility settings are turned on, and they are visible here."
        : "You have no accessibility settings turned on.",
      detail: a11yOn
        ? "Preferences like reduced motion, increased contrast or forced colors are shared with every site so pages can adapt. They are also, in effect, health-adjacent information, disclosed automatically, with no way to withhold the signal while still receiving the accommodation."
        : "These preferences are sent to every page so it can adapt. Most people leave them off, so having one turned on is unusual, and unusual is what makes a person identifiable.",
      how: "Read by script",
      sectionId: "preferences",
      evidence: [
        ["preferences", "prefers-reduced-motion"],
        ["preferences", "prefers-contrast"],
        ["preferences", "prefers-reduced-transparency"],
        ["preferences", "forced-colors"],
        ["preferences", "inverted-colors"],
      ],
    });
  }

  const pointer = str(g("preferences", "pointer"));
  add(
    {
      id: "f-input",
      group: "Your browser and settings",
      headline:
        pointer === "coarse"
          ? "You are on a touchscreen device."
          : "You are using a mouse or trackpad, not a touchscreen.",
      detail:
        "How precisely you can point, whether you can hover, and how many fingers the screen accepts say what kind of device you are on even when everything else is hidden.",
      how: "Read by script",
      sectionId: "preferences",
      evidence: [
        ["preferences", "pointer"],
        ["preferences", "hover"],
        ["navigator", "maxTouchPoints"],
      ],
    },
    [pointer]
  );

  const gpc = str(g("privacy", "Global Privacy Control"));
  add({
    id: "f-dnt",
    group: "Your browser and settings",
    headline:
      has(gpc) && gpc !== "not set"
        ? "You are sending an opt-out signal — one that some laws require sites to honour."
        : "You are not sending any do-not-track signal.",
    detail:
      has(gpc) && gpc !== "not set"
        ? "Global Privacy Control is legally binding in several US states. Do Not Track, its predecessor, never was — sites were free to ignore it, and almost all of them did."
        : "Do Not Track was a polite request that websites were free to ignore, and they did; it has largely been removed. Global Privacy Control replaced it and does carry legal weight in some places, but it is off by default in most browsers.",
    how: "Sent automatically",
    sectionId: "privacy",
    evidence: [
      ["privacy", "Do Not Track"],
      ["privacy", "Global Privacy Control"],
      ["server-derived", "DNT header"],
      ["server-derived", "Sec-GPC header"],
    ],
  });

  const blocker = str(g("privacy", "ad/tracker blocker present")) ?? "";
  if (has(blocker)) {
    const blocking = blocker.startsWith("yes");
    add({
      id: "f-blocker",
      group: "Your browser and settings",
      headline: blocking
        ? "You are running an ad or tracker blocker — which is itself a detail about you."
        : "No ad or tracker blocker was detected.",
      detail: blocking
        ? "Invisible decoy elements were planted with names that blocklists target, then checked to see which disappeared. Blocking is still worth doing, but only a minority do it, so it makes you more distinctive rather than less."
        : "Invisible decoy elements were planted with names that ad blockers remove. All of them survived.",
      how: "Read by script",
      sectionId: "privacy",
      evidence: [
        ["privacy", "ad/tracker blocker present"],
        ["privacy", "canvas readback noise"],
        ["privacy", "reduced timer precision"],
      ],
    });
  }

  /* ── what you did on this page ─────────────────────────────── */

  const moves = g("interaction", "pointermove events");
  add(
    {
      id: "f-interaction",
      group: "What you did on this page",
      headline: "Every movement you make in this window is being recorded.",
      detail:
        "Mouse path, clicks, keystroke counts, scrolling, the moment you switched tabs and the moment you came back: all observable with no permission. The rhythm of how you type and move is stable enough to serve as a biometric on its own.",
      how: "Read by script",
      sectionId: "interaction",
      evidence: [
        ["interaction", "pointermove events"],
        ["interaction", "last pointer position"],
        ["interaction", "click events"],
        ["interaction", "keydown events"],
        ["interaction", "scroll events"],
        ["interaction", "visibility changes"],
        ["interaction", "time on page"],
      ],
    },
    [moves]
  );

  const ref = g("server-derived", "Referer");
  add(
    {
      id: "f-referrer",
      group: "What you did on this page",
      headline: has(ref) && !String(ref).startsWith("none")
        ? "The page that sent you here is recorded."
        : "You came here directly, not from a link.",
      detail:
        "Browsers tell each site which page you were on immediately before. Follow that across enough sites, which is what embedded trackers do, and the trail becomes a browsing history.",
      how: "Sent automatically",
      sectionId: "server-derived",
      evidence: [
        ["server-derived", "Referer"],
        ["document", "document.referrer"],
        ["document", "history.length"],
      ],
    },
    [ref]
  );

  const ttfb = g("performance", "request → first byte");
  add(
    {
      id: "f-timing",
      group: "What you did on this page",
      headline: "This visit was timed to the millisecond.",
      detail:
        "How long the network took, how long your machine took to draw the page, and how long you have stayed. Slow drawing on a fast connection is another hint at how old or how loaded the device is.",
      how: "Read by script",
      sectionId: "performance",
      evidence: [
        ["performance", "request → first byte"],
        ["performance", "DOM interactive"],
        ["performance", "load event end"],
        ["performance", "first-contentful-paint"],
      ],
    },
    [ttfb]
  );

  /* ── granted ───────────────────────────────────────────────── */

  const lat = g("geolocation", "latitude");
  add(
    {
      id: "f-geo",
      group: "What you handed over",
      headline: `You handed over your exact position: ${lat}, ${g("geolocation", "longitude")}.`,
      detail:
        "Accurate to the meters shown below — a building, not a city. Granted once, a site can keep asking for it every time you return.",
      how: "You granted this",
      sectionId: "geolocation",
      evidence: [
        ["geolocation", "latitude"],
        ["geolocation", "longitude"],
        ["geolocation", "accuracy"],
        ["geolocation", "altitude"],
      ],
    },
    [lat]
  );

  const clip = g("clipboard", "clipboard length");
  add(
    {
      id: "f-clipboard",
      group: "What you handed over",
      headline: "Your clipboard was read.",
      detail:
        "Whatever you last copied, be it a password, an address or a private message, was handed over in full the moment you approved the prompt. Nothing afterwards indicates that it was read.",
      how: "You granted this",
      sectionId: "clipboard",
      evidence: [
        ["clipboard", "clipboard length"],
        ["clipboard", "clipboard contents"],
      ],
    },
    [clip]
  );

  const localFonts = g("local-fonts", "fonts installed");
  add(
    {
      id: "f-localfonts",
      group: "What you handed over",
      headline: `You handed over all ${localFonts} fonts installed on your system.`,
      detail:
        "Not an estimate this time: the real list, straight from the operating system. It reveals the software you own and, for many people, is unique on its own.",
      how: "You granted this",
      sectionId: "local-fonts",
      evidence: [
        ["local-fonts", "fonts installed"],
        ["local-fonts", "families"],
      ],
    },
    [localFonts]
  );

  const screens = g("screen-details", "screens attached");
  add(
    {
      id: "f-screens",
      group: "What you handed over",
      headline: `All ${plural(screens, "display")} attached to this machine are now visible.`,
      detail:
        "Including their arrangement on your desk, their resolutions and their manufacturer labels — a fair description of your workspace.",
      how: "You granted this",
      sectionId: "screen-details",
      evidence: [
        ["screen-details", "screens attached"],
        ["screen-details", "current screen label"],
      ],
    },
    [screens]
  );

  const idle = g("idle", "user state");
  add(
    {
      id: "f-idle",
      group: "What you handed over",
      headline: "Whether you are sitting at your computer is now readable.",
      detail:
        "Idle detection reports whether you are active and whether your screen is locked. It keeps reporting in the background, long after you stop looking at this page.",
      how: "You granted this",
      sectionId: "idle",
      evidence: [
        ["idle", "user state"],
        ["idle", "screen state"],
      ],
    },
    [idle]
  );

  const micLabel = sections.find((s) => s.id === "device-labels")?.rows.find((r) => r.k.includes("track label"));
  if (micLabel?.v) {
    add({
      id: "f-devicelabels",
      group: "What you handed over",
      headline: "Your camera and microphone now have names and permanent identifiers.",
      detail:
        "Granting access once reveals the hardware model of every recording device attached to your machine, plus stable identifiers for them that persist across visits.",
      how: "You granted this",
      sectionId: "device-labels",
      evidence: [["device-labels", micLabel.k]],
    });
  }

  const motionSample = g("sensors", "motion sample");
  add(
    {
      id: "f-sensors",
      group: "What you handed over",
      headline: "Your motion sensors are now readable.",
      detail:
        "Accelerometer and gyroscope readings carry tiny manufacturing imperfections unique to your individual handset — a fingerprint of the physical device that no browser reset can change.",
      how: "You granted this",
      sectionId: "sensors",
      evidence: [
        ["sensors", "orientation sample"],
        ["sensors", "motion sample"],
      ],
    },
    [motionSample]
  );

  const etagId = g("persistence", "HTTP cache (ETag) identifier");
  add(
    {
      id: "f-etag",
      group: "Who you are",
      headline: "There is an identifier hidden in your browser cache.",
      detail:
        "The server tagged one response with a unique label, and your browser hands that label back every time it checks whether its cached copy is still fresh. It is not a cookie and it is not site data, so clearing those leaves it untouched — only emptying the cache removes it.",
      how: "Sent automatically",
      sectionId: "persistence",
      evidence: [
        ["persistence", "HTTP cache (ETag) identifier"],
        ["persistence", "server has revalidated this ETag"],
        ["persistence", "ETag first issued"],
      ],
    },
    [etagId]
  );

  const cssHits = g("css-noscript", "probes that matched");
  const noJs = g("css-noscript", "javascript was disabled at some point");
  add(
    {
      id: "f-nojs",
      group: "Who you are",
      headline: `Turning off JavaScript would not stop this: ${cssHits} facts came from CSS alone.`,
      detail:
        "A style rule can request an image only when its condition is true. One rule per condition turns the pattern of image requests into your color scheme, screen density, window size, input device, accessibility settings and browser engine. Blocking scripts changes none of it, and one rule fires specifically when scripting is off.",
      how: "Sent automatically",
      sectionId: "css-noscript",
      evidence: [
        ["css-noscript", "probes in the stylesheet"],
        ["css-noscript", "probes that matched"],
        ["css-noscript", "javascript was disabled at some point"],
      ],
    },
    [cssHits]
  );
  void noJs;

  const tpOrigin = g("third-party", "embedded frame's origin");
  const tpRecognized = g("third-party", "frame recognized this browser");
  add(
    {
      id: "f-thirdparty",
      group: "Who you are",
      headline:
        tpRecognized === true
          ? "An embedded third party recognized you from another site."
          : "An embedded third party is running inside this page right now.",
      detail:
        tpRecognized === true
          ? "The frame in this page belongs to a different site, and it knew who you were before you arrived. That is the entire mechanism behind cross-site advertising: the same embedded party appears on thousands of sites and joins up what it sees on each of them."
          : "The frame in this page belongs to a different site and is storing its own identifier from inside your visit — the position every ad tag occupies. Your browser appears to be partitioning its storage, which keeps that identifier from being joined up with the one it holds elsewhere.",
      how: "Read by script",
      sectionId: "third-party",
      evidence: [
        ["third-party", "embedded frame's origin"],
        ["third-party", "identifier the frame holds"],
        ["third-party", "frame recognized this browser"],
        ["third-party", "third-party cookie written"],
        ["third-party", "referrer passed to the frame"],
      ],
    },
    [tpOrigin]
  );

  const tabs = g("cross-tab", "other tabs of this site open");
  add(
    {
      id: "f-tabs",
      group: "What you did on this page",
      headline:
        Number(tabs) > 0
          ? `You have ${tabs} other tab${Number(tabs) === 1 ? "" : "s"} of this site open.`
          : "Tabs of this site can see and talk to each other.",
      detail:
        "Pages of the same site share a broadcast channel, so anything learned in one tab is instantly available in all of them — and the number of tabs you keep open is itself a habit that describes you.",
      how: "Read by script",
      sectionId: "cross-tab",
      evidence: [
        ["cross-tab", "other tabs of this site open"],
        ["cross-tab", "BroadcastChannel"],
        ["cross-tab", "locks currently held"],
      ],
    },
    [tabs]
  );

  const apps = sections.find((s) => s.id === "schemes")?.rows.filter((r) => String(r.v).startsWith("appears"));
  if (apps?.length) {
    add({
      id: "f-apps",
      group: "What you handed over",
      headline: `${apps.length} desktop application${apps.length === 1 ? "" : "s"} on this machine responded.`,
      detail:
        "A web page asked your browser to open each application's private URL scheme and watched which answered. The software you install is not something the web is supposed to see.",
      how: "You granted this",
      sectionId: "schemes",
      evidence: apps.map((r) => ["schemes", r.k] as [string, string]),
    });
  }

  return out;
}
