import type { GatedResult, Section } from "./types";
import {
  SCHEMES,
  probeClipboard,
  probeIdle,
  probeSchemes,
  probeScreenDetails,
  probeSensors,
} from "./advanced";
import { probeDeviceLabels, probeGeolocation, probeLocalFonts } from "./collect";
import { CATALOGUE } from "./methods";

/* ── reading the collected data ──────────────────────────────── */

/** Look up one collected field. The ledger only ever reads; it never probes. */
export type Get = (sectionId: string, key: string) => unknown;

export function getter(sections: Section[]): Get {
  const ix = new Map<string, Map<string, unknown>>();
  for (const s of sections) {
    ix.set(s.id, new Map(s.rows.map((r) => [r.k, r.v])));
  }
  return (sectionId, key) => ix.get(sectionId)?.get(key);
}

const has = (v: unknown) => v !== undefined && v !== null && v !== "";
const num = (v: unknown) => (typeof v === "number" ? v : Number.NaN);
const plural = (n: number, word: string, many = `${word}s`) =>
  `${n} ${n === 1 ? word : many}`;

/** Comma-joined lists are how sections store arrays; this takes them apart. */
const split = (v: unknown) =>
  typeof v === "string" && v ? v.split(", ").map((s) => s.trim()).filter(Boolean) : [];

/* ── the contrast ────────────────────────────────────────────── */

/**
 * The argument this section exists to make.
 *
 * Most of these capabilities have a passive shadow: the page has already
 * estimated your fonts by measuring text width, guessed your region from your
 * clock, counted your cameras without learning their names. A prompt does not
 * reveal something new so much as convert a guess into a certainty, and
 * putting the two side by side says that better than any paragraph.
 *
 * Where no shadow exists, `before` is undefined and the row says so outright.
 * "Nothing on this page could guess this" is a real finding, not a gap.
 */
export type Contrast = {
  /** what the page worked out without asking, if anything */
  before?: string;
  /** what it knows once you approve — only available after the fact */
  after?: string;
  /** the difference, stated plainly */
  note?: string;
};

export type GatedCapability = {
  /** matches the section id the probe produces */
  id: string;
  name: string;
  /** what a single approval hands over, in plain English */
  reveals: string;
  /**
   * Permissions API names behind this capability. Their state is readable
   * without prompting — which is itself one of the things worth showing.
   */
  permissions: string[];
  /** the verb shown while the probe is working, after you have answered */
  working: string;
  /**
   * Whether this browser implements the capability at all.
   *
   * Firefox and Safari ship none of `queryLocalFonts`, `getScreenDetails` or
   * `IdleDetector`, and their Permissions API does not recognise the names
   * either — so the resting state is unreadable and the honest caption is
   * about the browser, not about you. Touches `window`, so it runs only after
   * mount.
   */
  supported: () => boolean;
  contrast: (get: Get) => Contrast;
  run: () => Promise<GatedResult>;
  /** the one probe that acts on your machine rather than reading it */
  intrusive?: { warning: string; schemes: string[] };
};

/**
 * Ordered by intimacy rather than by API, so reading down the list is itself
 * the argument. Scheme flooding is last and set apart: it is the only entry
 * that does something to your computer instead of asking it a question.
 */
export const CAPABILITIES: GatedCapability[] = [
  {
    id: "geolocation",
    name: "Precise location",
    reveals:
      "Where you are, to within a few meters — a building, not a city — from satellite, nearby wi-fi networks and cell towers.",
    permissions: ["geolocation"],
    working: "Waiting for a location fix…",
    supported: () => "geolocation" in navigator,
    contrast: (g) => {
      const tz = g("locale", "Intl timeZone");
      const lat = g("geolocation", "latitude");
      // Five decimal places is about a meter — already finer than any fix.
      const coord = (v: unknown) => (typeof v === "number" ? v.toFixed(5) : v);
      return {
        before: has(tz)
          ? `Your region, from your clock alone: ${tz}.`
          : undefined,
        after: has(lat)
          ? `${coord(lat)}, ${coord(g("geolocation", "longitude"))} — accurate to ${g("geolocation", "accuracy")}.`
          : undefined,
        note: has(lat)
          ? "A timezone covers millions of people. This covers your building."
          : undefined,
      };
    },
    run: probeGeolocation,
  },
  {
    id: "device-labels",
    name: "Camera and microphone",
    reveals:
      "The model name of every recording device attached to your machine, plus identifiers for them that stay the same every time you come back.",
    permissions: ["camera", "microphone"],
    working: "Opening the capture stream…",
    supported: () => Boolean(navigator.mediaDevices?.getUserMedia),
    contrast: (g) => {
      const mics = num(g("devices", "audioinput"));
      const cams = num(g("devices", "videoinput"));
      const labels = [g("device-labels", "audio track label"), g("device-labels", "video track label")]
        .filter(has)
        .map(String);
      return {
        before: Number.isFinite(mics + cams)
          ? `${plural(mics, "microphone")} and ${plural(cams, "camera")}, counted without asking — with every name hidden.`
          : undefined,
        after: labels.length ? labels.join(" · ") : undefined,
        note: labels.length
          ? "The identifiers alongside these names persist for this site across visits, which is enough to recognize this machine on its own."
          : undefined,
      };
    },
    run: probeDeviceLabels,
  },
  {
    id: "clipboard",
    name: "Clipboard contents",
    reveals:
      "Whatever you last copied, in full — frequently a password, an address or a private message.",
    permissions: ["clipboard-read"],
    working: "Reading your clipboard…",
    supported: () => Boolean((navigator as { clipboard?: { readText?: unknown } }).clipboard?.readText),
    contrast: (g) => {
      const len = num(g("clipboard", "clipboard length"));
      return {
        before: undefined,
        after: Number.isFinite(len)
          ? len === 0
            ? "Your clipboard was empty."
            : `${plural(len, "character")}, shown in full below.`
          : undefined,
        note: Number.isFinite(len)
          ? "Nothing indicated that the read happened, and nothing indicates now that it is over."
          : undefined,
      };
    },
    run: probeClipboard,
  },
  {
    id: "screen-details",
    name: "Every attached display",
    reveals:
      "Each monitor you have plugged in: its resolution, its manufacturer label, and where it sits relative to the others on your desk.",
    permissions: ["window-management"],
    working: "Reading your displays…",
    supported: () => "getScreenDetails" in window,
    contrast: (g) => {
      const w = g("screen", "screen.width");
      const h = g("screen", "screen.height");
      const extended = g("screen", "screen.isExtended");
      const count = num(g("screen-details", "screens attached"));
      return {
        before: has(w)
          ? `One screen, ${w}×${h}${extended === true ? ", and the bare fact that there is more than one" : ""}.`
          : undefined,
        after: Number.isFinite(count)
          ? `${plural(count, "display")}, each with its label, resolution and position.`
          : undefined,
        note: Number.isFinite(count) && count > 1
          ? "Monitor labels name hardware you bought, and the arrangement describes a desk."
          : undefined,
      };
    },
    run: probeScreenDetails,
  },
  {
    id: "local-fonts",
    name: "Installed fonts",
    reveals:
      "Every typeface on your system, straight from the operating system — the software you own, spelled out.",
    permissions: ["local-fonts"],
    working: "Reading the system font list…",
    supported: () => "queryLocalFonts" in window,
    contrast: (g) => {
      const detected = num(g("fonts", "fonts detected"));
      const probed = num(g("fonts", "fonts probed"));
      const installed = num(g("local-fonts", "fonts installed"));
      const families = num(g("local-fonts", "families"));

      let note: string | undefined;
      if (Number.isFinite(installed)) {
        // The guess could only ever find faces it already knew to look for.
        // Naming a few of the ones it missed makes that concrete.
        const seen = split(g("fonts", "detected list"));
        const real = split(g("local-fonts", "family list"));
        const missed = real.filter((f) => !seen.some((s) => f.toLowerCase() === s.toLowerCase()));
        if (missed.length) {
          note = `${plural(missed.length, "family", "families")} width measurement could not see, including ${missed.slice(0, 3).join(", ")}. It can only find faces it already knew to ask about.`;
        }
      }

      return {
        before: Number.isFinite(detected)
          ? `${detected} of ${probed} common faces, found by measuring how wide text renders.`
          : undefined,
        after: Number.isFinite(installed)
          ? installed === 0
            ? "Nothing — you chose to hand over none of them."
            : `${plural(installed, "font")} in ${plural(families, "family", "families")}, the real list.`
          : undefined,
        note,
      };
    },
    run: probeLocalFonts,
  },
  {
    id: "idle",
    name: "Idle and lock state",
    reveals:
      "Whether you are sitting at your keyboard and whether your screen is locked — continuously, in the background, long after you stop looking at this page.",
    permissions: ["idle-detection"],
    working: "Starting the idle detector…",
    supported: () => "IdleDetector" in window,
    contrast: (g) => {
      const state = g("idle", "user state");
      return {
        before:
          "Whether this tab has focus, and the clicks and keystrokes inside it — only while you are actually here.",
        after: has(state)
          ? `You are ${state}, with the screen ${g("idle", "screen state")}.`
          : undefined,
        note: has(state)
          ? "This keeps reporting after you switch away, which the counters above cannot do."
          : undefined,
      };
    },
    run: probeIdle,
  },
  {
    id: "sensors",
    name: "Motion sensors",
    reveals:
      "Accelerometer and gyroscope readings, whose tiny manufacturing imperfections identify your individual handset.",
    permissions: ["accelerometer", "gyroscope"],
    working: "Listening for movement…",
    supported: () => "DeviceOrientationEvent" in window,
    contrast: (g) => {
      const sample = g("sensors", "motion sample");
      return {
        before: undefined,
        after: has(sample) ? String(sample) : undefined,
        note: has(sample)
          ? "The calibration noise in these numbers is a fingerprint of the physical device. Clearing your browser does not change it."
          : undefined,
      };
    },
    run: probeSensors,
  },
  {
    id: "schemes",
    name: "Installed desktop applications",
    reveals:
      "Which desktop applications you have installed — software you never told any website about.",
    permissions: [],
    working: "Trying each application in turn…",
    supported: () => true,
    contrast: (g) => {
      const hits = SCHEMES.map(([, name]) => [name, g("schemes", name)] as const).filter(
        ([, v]) => typeof v === "string" && v.startsWith("appears")
      );
      const ran = SCHEMES.some(([, name]) => has(g("schemes", name)));
      return {
        before: undefined,
        after: ran
          ? hits.length
            ? `${hits.map(([name]) => name).join(", ")} — ${plural(hits.length, "application")} that answered.`
            : "Nothing answered. Either none of the twelve are installed, or your browser refuses the technique."
          : undefined,
        note: hits.length
          ? "No permission was involved. There is no prompt for this, and no setting that turns it off."
          : undefined,
      };
    },
    run: probeSchemes,
    intrusive: {
      warning:
        "This asks your browser to open the private URL of a dozen desktop applications and watches which ones answer. Some of them may genuinely launch. It is the only probe on this page that acts on your machine rather than reading it, and it is here because it works.",
      schemes: SCHEMES.map(([scheme]) => `${scheme}://`),
    },
  },
];

/** How many entries appear after the rule, set apart from the rest. */
export const INTRUSIVE_COUNT = CAPABILITIES.filter((c) => c.intrusive).length;

/* ── the resting state, read without prompting ───────────────── */

export type RestingState = "granted" | "blocked" | "unasked" | "unsupported" | "unknown";

/**
 * What the browser will already say about a capability before anyone presses
 * anything.
 *
 * This is read out of the `permissions` table the page has already collected,
 * which is the demonstration in miniature: a site learns whether you have
 * allowed, blocked or never been asked about its camera without showing you
 * a single prompt.
 */
export function restingState(
  cap: GatedCapability,
  get: Get,
  supported = true
): RestingState {
  if (!supported) return "unsupported";
  const states = cap.permissions
    .map((name) => get("permissions", name))
    .filter((s): s is string => typeof s === "string");
  if (!states.length) return "unknown";
  if (states.some((s) => s === "denied")) return "blocked";
  if (states.every((s) => s === "granted")) return "granted";
  if (states.some((s) => s === "prompt")) return "unasked";
  return "unknown";
}

export const RESTING_CAPTION: Record<RestingState, string> = {
  granted: "already allowed",
  blocked: "blocked in your browser",
  unasked: "never asked",
  unsupported: "not available in this browser",
  // Chromium answers for every name below; elsewhere some are simply not
  // queryable, and inventing a state for them would be worse than silence.
  unknown: "never asked",
};

/* ── links into the catalogue ────────────────────────────────── */

/** section id → the slug of the technique's entry on /methods. */
export const METHOD_SLUG: Record<string, string> = Object.fromEntries(
  CATALOGUE.flatMap((group) =>
    group.methods.filter((m) => m.section).map((m) => [m.section as string, m.slug])
  )
);
