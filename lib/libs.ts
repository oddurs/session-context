/* eslint-disable @typescript-eslint/no-explicit-any */
import FingerprintJS, { componentsToDebugString } from "@fingerprintjs/fingerprintjs";
import UAParser from "ua-parser-js";
import { detectIncognito } from "detectincognitojs";
import type { Row, Section } from "./types";

/** Flatten one FingerprintJS component into a printable value. */
function comp(v: any): unknown {
  if (v == null) return v;
  if (Array.isArray(v)) return v.length > 24 ? `${v.slice(0, 24).join(", ")} … (+${v.length - 24})` : v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return v;
}

export async function fingerprintSections(): Promise<Section[]> {
  const rows: Row[] = [];
  const compRows: Row[] = [];
  try {
    const agent = await FingerprintJS.load({ debug: false });
    const res = await agent.get();
    rows.push(
      { k: "visitorId", v: res.visitorId, n: "stable across sessions" },
      { k: "confidence.score", v: res.confidence.score },
      { k: "confidence.comment", v: (res.confidence as any).comment },
      { k: "version", v: res.version },
      { k: "components collected", v: Object.keys(res.components).length },
      { k: "debug string length", v: componentsToDebugString(res.components).length }
    );
    for (const [key, c] of Object.entries(res.components as any)) {
      const cc = c as any;
      compRows.push({
        k: key,
        v: "error" in cc ? `error: ${cc.error?.message ?? cc.error}` : comp(cc.value),
        n: cc.duration != null ? `${cc.duration} ms` : undefined,
      });
    }
  } catch (e) {
    rows.push({ k: "FingerprintJS", v: `error: ${(e as Error).message}` });
  }

  return [
    {
      id: "visitor-id",
      title: "Visitor Identifier (FingerprintJS)",
      note: "An open-source industry fingerprinter, run locally. It reduces dozens of weak signals into one identifier that typically survives clearing cookies, changing IP, and switching to a new window of the same browser.",
      rows,
    },
    {
      id: "fp-components",
      title: "Fingerprint Components (FingerprintJS)",
      note: "Every individual entropy source the library sampled, with the time each took to collect. These are the raw inputs to the identifier above.",
      rows: compRows,
    },
  ];
}

export function uaParserSection(): Section {
  const r: any = new (UAParser as any)().getResult();
  return {
    id: "ua-parsed",
    title: "Parsed User Agent (ua-parser-js)",
    note: "The UA string decomposed the way analytics and ad platforms decompose it. Everything here is inference from a single string the browser volunteers on every request.",
    rows: [
      { k: "browser.name", v: r.browser?.name },
      { k: "browser.version", v: r.browser?.version },
      { k: "browser.major", v: r.browser?.major },
      { k: "engine.name", v: r.engine?.name },
      { k: "engine.version", v: r.engine?.version },
      { k: "os.name", v: r.os?.name },
      { k: "os.version", v: r.os?.version },
      { k: "device.vendor", v: r.device?.vendor },
      { k: "device.model", v: r.device?.model },
      { k: "device.type", v: r.device?.type ?? "desktop (implied)" },
      { k: "cpu.architecture", v: r.cpu?.architecture },
      { k: "ua string parsed", v: r.ua },
    ],
  };
}

export async function privacySection(): Promise<Section> {
  const rows: Row[] = [];

  try {
    const inc = await detectIncognito();
    rows.push(
      { k: "private/incognito mode", v: inc.isPrivate, n: "detectIncognito heuristics" },
      { k: "browser identified as", v: inc.browserName }
    );
  } catch (e) {
    rows.push({ k: "incognito detection", v: `error: ${(e as Error).message}` });
  }

  rows.push(
    { k: "Do Not Track", v: (navigator as any).doNotTrack ?? "not set" },
    { k: "Global Privacy Control", v: (navigator as any).globalPrivacyControl ?? "not set" },
    { k: "cookies enabled", v: navigator.cookieEnabled },
    { k: "third-party cookie writes", v: await thirdPartyCookieProbe() },
    { k: "ad/tracker blocker present", v: await domBlockerProbe(), n: "bait-element heuristic" },
    { k: "storage partitioned", v: (document as any).hasStorageAccess ? "Storage Access API present" : "unknown" },
    { k: "timezone vs language mismatch", v: tzLanguageMismatch(), n: "weak VPN indicator" },
    { k: "screen dimensions rounded", v: rounded(), n: "letterboxing / RFP indicator" },
    { k: "reduced timer precision", v: timerPrecision() },
    { k: "canvas readback noise", v: canvasNoise(), n: "two identical draws compared" },
    { k: "WebGL software renderer", v: softwareRenderer(), n: "VM / headless indicator" }
  );

  return {
    id: "privacy",
    title: "Privacy Posture & Countermeasures",
    note: "Whether this browser is running any of the common defenses — and, revealingly, the fact that the defenses themselves are detectable and therefore add entropy of their own.",
    rows,
  };
}

async function thirdPartyCookieProbe(): Promise<string> {
  try {
    document.cookie = "dm_probe=1; SameSite=None; Secure; path=/";
    const ok = document.cookie.includes("dm_probe=1");
    document.cookie = "dm_probe=; Max-Age=0; path=/";
    return ok ? "SameSite=None cookie accepted" : "SameSite=None cookie rejected";
  } catch (e) {
    return `error: ${(e as Error).message}`;
  }
}

async function domBlockerProbe(): Promise<string> {
  const baits = [
    "ad-banner", "adsbox", "ad-placement", "banner-ads", "sponsored-ad",
    "pub_300x250", "google-ad", "textads", "adsbygoogle",
  ];
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-9999px;top:-9999px";
  for (const cls of baits) {
    const el = document.createElement("div");
    el.className = cls;
    el.style.cssText = "width:10px;height:10px;position:absolute";
    el.textContent = " ";
    host.appendChild(el);
  }
  document.body.appendChild(host);
  await new Promise((r) => setTimeout(r, 60));
  const blocked = [...host.children].filter((el) => {
    const s = getComputedStyle(el as HTMLElement);
    return (
      (el as HTMLElement).offsetHeight === 0 ||
      s.display === "none" ||
      s.visibility === "hidden"
    );
  }).length;
  host.remove();
  return blocked > 0 ? `yes — ${blocked}/${baits.length} bait elements hidden` : "no bait elements blocked";
}

function tzLanguageMismatch(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  const lang = navigator.language ?? "";
  const region = lang.split("-")[1];
  const zoneRegion = tz.split("/")[0];
  if (!region) return `language '${lang}' carries no region — cannot compare with '${tz}'`;
  return `language region ${region} vs timezone ${tz} (${zoneRegion})`;
}

function rounded(): string {
  const w = screen.width;
  const h = screen.height;
  const round = w % 100 === 0 && h % 100 === 0;
  return `${w}×${h} — ${round ? "suspiciously round (likely spoofed)" : "not rounded"}`;
}

function timerPrecision(): string {
  let min = Infinity;
  let prev = performance.now();
  for (let i = 0; i < 200000; i++) {
    const t = performance.now();
    const d = t - prev;
    if (d > 0 && d < min) min = d;
    prev = t;
  }
  if (!Number.isFinite(min)) return "unmeasurable";
  const coarse = min >= 0.1;
  return `${min.toFixed(6)} ms tick — ${coarse ? "coarsened (anti-fingerprinting active)" : "high resolution"}`;
}

function canvasNoise(): string {
  const draw = () => {
    const c = document.createElement("canvas");
    c.width = 60; c.height = 20;
    const x = c.getContext("2d")!;
    x.textBaseline = "top";
    x.font = "12px serif";
    x.fillStyle = "#123456";
    x.fillText("noise?", 2, 2);
    return c.toDataURL();
  };
  return draw() === draw() ? "stable (no randomization)" : "differs between draws (randomized)";
}

function softwareRenderer(): string {
  try {
    const gl: any = document.createElement("canvas").getContext("webgl");
    const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
    const r = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER);
    if (!r) return "unknown";
    const soft = /swiftshader|llvmpipe|software|mesa offscreen|virgl/i.test(String(r));
    return `${r} — ${soft ? "software rasterizer" : "hardware accelerated"}`;
  } catch (e) {
    return `error: ${(e as Error).message}`;
  }
}
