import type { IconName } from "@/components/Icon";

export type Subgroup = { title: string; blurb?: string; ids: string[] };
export type Category = {
  id: string;
  title: string;
  /** A rail is a margin, not a sentence: the index uses these. */
  short: string;
  icon: IconName;
  blurb: string;
  subgroups: Subgroup[];
};

/** How the raw tables are organized: six categories, each with subsections. */
export const CATEGORIES: Category[] = [
  {
    id: "server",
    short: "Before any code",
    title: "Known before any code runs",
    icon: "server",
    blurb:
      "Your browser sends all of this by itself, on every request, whether or not the page contains a single line of JavaScript. Blocking scripts does not stop it.",
    subgroups: [
      { title: "What your browser volunteered", ids: ["request-headers", "client-hints"] },
      { title: "The network connection underneath", ids: ["connection", "server-derived"] },
      { title: "Fingerprinting with no JavaScript at all", ids: ["css-noscript"] },
    ],
  },
  {
    id: "identity",
    short: "Recognizability",
    title: "How recognizable you are",
    icon: "fingerprint",
    blurb:
      "Whether this site can pick you out of a crowd and know you are the same person who visited before — without you logging in, and without relying on cookies.",
    subgroups: [
      { title: "Your device fingerprint", ids: ["visitor-id", "fp-components", "fingerprints"] },
      { title: "Identifiers stored on your machine", ids: ["persistence"] },
      { title: "Checks for faked or automated browsers", ids: ["worker", "tamper"] },
      { title: "Your privacy defenses, and whether they show", ids: ["privacy"] },
      { title: "Cross-site tracking", ids: ["third-party", "trackers"] },
    ],
  },
  {
    id: "browser",
    short: "Browser",
    title: "Your browser",
    icon: "browser",
    blurb:
      "What it claims to be, what it can actually do, and the small inconsistencies that reveal the truth if those two disagree.",
    subgroups: [
      { title: "What it says it is", ids: ["navigator", "ua-parsed", "ua-client-hints"] },
      { title: "What it is capable of", ids: ["features", "engine"] },
      { title: "Fonts it can see on your system", ids: ["fonts"] },
    ],
  },
  {
    id: "device",
    short: "Device",
    title: "The machine in front of you",
    icon: "chip",
    blurb:
      "Physical characteristics of your computer or phone: its screen, its chips, its speed and what it is plugged into.",
    subgroups: [
      { title: "Screen and system theme", ids: ["screen", "system-ui"] },
      { title: "Processor, graphics and speed", ids: ["hardware", "graphics", "benchmark", "thermal"] },
      { title: "Sound, video and cameras", ids: ["audio", "codecs", "media-capabilities", "devices"] },
      { title: "Your internet connection", ids: ["network"] },
    ],
  },
  {
    id: "session",
    short: "Settings & visit",
    title: "Your settings and this visit",
    icon: "sliders",
    blurb:
      "Preferences your operating system shares with every site, what this page is allowed to do, and a record of what you did while you were here.",
    subgroups: [
      { title: "Preferences you never chose to share", ids: ["preferences", "locale"] },
      { title: "This page, its storage and its permissions", ids: ["document", "storage", "permissions"] },
      { title: "What you did on this page", ids: ["performance", "interaction", "typing", "cross-tab"] },
    ],
  },
  {
    id: "granted",
    short: "Permission",
    title: "Unlocked by permission",
    icon: "key",
    blurb:
      "Everything above needed no permission at all. These sections appear only after you press a button and approve the browser's prompt.",
    subgroups: [
      {
        title: "Unlocked by your approval",
        ids: ["geolocation", "local-fonts", "device-labels", "screen-details", "clipboard", "idle", "sensors", "schemes"],
      },
    ],
  },
];

/** section id → [category title, subgroup title] */
export const PLACEMENT: Record<string, [string, string]> = Object.fromEntries(
  CATEGORIES.flatMap((c) => c.subgroups.flatMap((sg) => sg.ids.map((id) => [id, [c.title, sg.title]])))
);

export const SECTION_ORDER: string[] = CATEGORIES.flatMap((c) =>
  c.subgroups.flatMap((sg) => sg.ids)
);

export const ICON_FOR_GROUP: Record<string, IconName> = {
  "Who you are": "fingerprint",
  "Where you are": "globe",
  "The machine in front of you": "chip",
  "Your browser and settings": "browser",
  "What you did on this page": "eye",
  "What you handed over": "key",
};
