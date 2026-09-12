/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Row, Section } from "./types";
import { list, probe, probeAsync } from "./probe";

/* ── helpers ─────────────────────────────────────────────────── */

const w = () => window as any;
const n = () => navigator as any;

/** 32-bit FNV-1a, hex. Used for stable fingerprint digests. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const bytes = (b: unknown) =>
  typeof b === "number" ? `${b.toLocaleString()} (${(b / 1048576).toFixed(1)} MiB)` : b;


const mq = (q: string) => probe(() => matchMedia(q).matches);

/** First matching value from a set of media-query candidates. */
function mqPick(feature: string, values: string[]) {
  return probe(() => {
    for (const v of values) if (matchMedia(`(${feature}: ${v})`).matches) return v;
    return "no match";
  });
}

/* ── 1. navigator ────────────────────────────────────────────── */

function navigatorSection(): Section {
  const nv = n();
  return {
    id: "navigator",
    title: "Navigator",
    note: "The classic navigator surface. Much of it is frozen or spoofed by modern browsers for anti-fingerprinting reasons, but it is still what most server-side detection reads.",
    rows: [
      { k: "userAgent", v: probe(() => nv.userAgent) },
      { k: "appVersion", v: probe(() => nv.appVersion) },
      { k: "appName", v: probe(() => nv.appName), n: "frozen to 'Netscape'" },
      { k: "appCodeName", v: probe(() => nv.appCodeName), n: "frozen to 'Mozilla'" },
      { k: "platform", v: probe(() => nv.platform) },
      { k: "product", v: probe(() => nv.product), n: "frozen to 'Gecko'" },
      { k: "productSub", v: probe(() => nv.productSub) },
      { k: "vendor", v: probe(() => nv.vendor) },
      { k: "vendorSub", v: probe(() => nv.vendorSub) },
      { k: "oscpu", v: probe(() => nv.oscpu), n: "Firefox only" },
      { k: "buildID", v: probe(() => nv.buildID), n: "Firefox only" },
      { k: "language", v: probe(() => nv.language) },
      { k: "languages", v: probe(() => list(nv.languages)) },
      { k: "onLine", v: probe(() => nv.onLine) },
      { k: "cookieEnabled", v: probe(() => nv.cookieEnabled) },
      { k: "doNotTrack", v: probe(() => nv.doNotTrack) },
      { k: "globalPrivacyControl", v: probe(() => nv.globalPrivacyControl) },
      { k: "hardwareConcurrency", v: probe(() => nv.hardwareConcurrency), n: "logical cores" },
      { k: "deviceMemory", v: probe(() => nv.deviceMemory), n: "GiB, rounded + capped at 8" },
      { k: "maxTouchPoints", v: probe(() => nv.maxTouchPoints) },
      { k: "pdfViewerEnabled", v: probe(() => nv.pdfViewerEnabled) },
      { k: "webdriver", v: probe(() => nv.webdriver), n: "true under automation" },
      { k: "javaEnabled()", v: probe(() => nv.javaEnabled()) },
      { k: "userActivation.isActive", v: probe(() => nv.userActivation?.isActive) },
      { k: "userActivation.hasBeenActive", v: probe(() => nv.userActivation?.hasBeenActive) },
      { k: "plugins.length", v: probe(() => nv.plugins?.length) },
      { k: "plugins", v: probe(() => Array.from(nv.plugins ?? [], (p: any) => p.name).join(", ")) },
      { k: "mimeTypes.length", v: probe(() => nv.mimeTypes?.length) },
      { k: "mimeTypes", v: probe(() => Array.from(nv.mimeTypes ?? [], (m: any) => m.type).join(", ")) },
    ],
  };
}

/* ── 2. user-agent client hints ──────────────────────────────── */

async function uaDataSection(): Promise<Section> {
  const uad = n().userAgentData;
  const rows: Row[] = [
    { k: "userAgentData", v: uad ? "supported" : undefined, n: "Chromium only" },
  ];
  if (uad) {
    rows.push(
      { k: "brands", v: probe(() => uad.brands.map((b: any) => `${b.brand} ${b.version}`).join(", ")) },
      { k: "mobile", v: probe(() => uad.mobile) },
      { k: "platform", v: probe(() => uad.platform) }
    );
    const hints = [
      "architecture", "bitness", "model", "platformVersion",
      "uaFullVersion", "fullVersionList", "wow64", "formFactors",
    ];
    const hi: any = await probeAsync(() => uad.getHighEntropyValues(hints));
    if (hi && typeof hi === "object") {
      for (const h of hints) {
        const val = hi[h];
        rows.push({
          k: `highEntropy.${h}`,
          v: Array.isArray(val)
            ? val.map((b: any) => (b.brand ? `${b.brand} ${b.version}` : b)).join(", ")
            : val,
        });
      }
    } else {
      rows.push({ k: "getHighEntropyValues()", v: hi });
    }
  }
  return {
    id: "ua-client-hints",
    title: "User-Agent Client Hints",
    note: "The structured replacement for the UA string. High-entropy values are only handed out on request, and the server only receives them if it asks via Accept-CH.",
    rows,
  };
}

/* ── 3. screen & viewport ────────────────────────────────────── */

function screenSection(): Section {
  const s = screen as any;
  return {
    id: "screen",
    title: "Screen & Viewport",
    note: "Physical display geometry versus the actual painted area. The gap between outer and inner dimensions leaks browser chrome, toolbars and devtools state.",
    rows: [
      { k: "screen.width", v: probe(() => s.width) },
      { k: "screen.height", v: probe(() => s.height) },
      { k: "screen.availWidth", v: probe(() => s.availWidth) },
      { k: "screen.availHeight", v: probe(() => s.availHeight) },
      { k: "screen.availLeft", v: probe(() => s.availLeft) },
      { k: "screen.availTop", v: probe(() => s.availTop) },
      { k: "screen.colorDepth", v: probe(() => s.colorDepth) },
      { k: "screen.pixelDepth", v: probe(() => s.pixelDepth) },
      { k: "screen.isExtended", v: probe(() => s.isExtended), n: "multi-monitor setup" },
      { k: "screen.orientation.type", v: probe(() => s.orientation?.type) },
      { k: "screen.orientation.angle", v: probe(() => s.orientation?.angle) },
      { k: "devicePixelRatio", v: probe(() => devicePixelRatio) },
      { k: "window.outerWidth", v: probe(() => outerWidth) },
      { k: "window.outerHeight", v: probe(() => outerHeight) },
      { k: "window.innerWidth", v: probe(() => innerWidth) },
      { k: "window.innerHeight", v: probe(() => innerHeight) },
      { k: "window.screenX", v: probe(() => screenX) },
      { k: "window.screenY", v: probe(() => screenY) },
      { k: "chrome height (outer-inner)", v: probe(() => outerHeight - innerHeight), n: "toolbars + devtools" },
      { k: "documentElement.clientWidth", v: probe(() => document.documentElement.clientWidth) },
      { k: "documentElement.clientHeight", v: probe(() => document.documentElement.clientHeight) },
      { k: "visualViewport.width", v: probe(() => w().visualViewport?.width) },
      { k: "visualViewport.height", v: probe(() => w().visualViewport?.height) },
      { k: "visualViewport.scale", v: probe(() => w().visualViewport?.scale) },
      { k: "visualViewport.offsetLeft", v: probe(() => w().visualViewport?.offsetLeft) },
      { k: "visualViewport.offsetTop", v: probe(() => w().visualViewport?.offsetTop) },
      { k: "visualViewport.pageLeft", v: probe(() => w().visualViewport?.pageLeft) },
      { k: "visualViewport.pageTop", v: probe(() => w().visualViewport?.pageTop) },
      { k: "scrollX / scrollY", v: probe(() => `${scrollX} / ${scrollY}`) },
    ],
  };
}

/* ── 4. media-query preferences ──────────────────────────────── */

function preferencesSection(): Section {
  return {
    id: "preferences",
    title: "Rendering Preferences & Capabilities",
    note: "CSS media features resolved against this session. These reflect OS-level accessibility settings, input hardware, and how the page is being displayed.",
    rows: [
      { k: "prefers-color-scheme", v: mqPick("prefers-color-scheme", ["dark", "light"]) },
      { k: "prefers-reduced-motion", v: mqPick("prefers-reduced-motion", ["reduce", "no-preference"]) },
      { k: "prefers-reduced-transparency", v: mqPick("prefers-reduced-transparency", ["reduce", "no-preference"]) },
      { k: "prefers-reduced-data", v: mqPick("prefers-reduced-data", ["reduce", "no-preference"]) },
      { k: "prefers-contrast", v: mqPick("prefers-contrast", ["more", "less", "custom", "no-preference"]) },
      { k: "forced-colors", v: mqPick("forced-colors", ["active", "none"]) },
      { k: "inverted-colors", v: mqPick("inverted-colors", ["inverted", "none"]) },
      { k: "color-gamut", v: mqPick("color-gamut", ["rec2020", "p3", "srgb"]) },
      { k: "dynamic-range", v: mqPick("dynamic-range", ["high", "standard"]) },
      { k: "video-dynamic-range", v: mqPick("video-dynamic-range", ["high", "standard"]) },
      { k: "monochrome", v: probe(() => (matchMedia("(monochrome: 0)").matches ? "0 (color)" : "non-zero")) },
      { k: "pointer", v: mqPick("pointer", ["fine", "coarse", "none"]) },
      { k: "any-pointer", v: mqPick("any-pointer", ["fine", "coarse", "none"]) },
      { k: "hover", v: mqPick("hover", ["hover", "none"]) },
      { k: "any-hover", v: mqPick("any-hover", ["hover", "none"]) },
      { k: "display-mode", v: mqPick("display-mode", ["standalone", "fullscreen", "minimal-ui", "window-controls-overlay", "browser"]) },
      { k: "orientation", v: mqPick("orientation", ["portrait", "landscape"]) },
      { k: "scripting", v: mqPick("scripting", ["enabled", "initial-only", "none"]) },
      { k: "update", v: mqPick("update", ["fast", "slow", "none"]) },
      { k: "overflow-block", v: mqPick("overflow-block", ["scroll", "paged", "optional-paged", "none"]) },
      { k: "overflow-inline", v: mqPick("overflow-inline", ["scroll", "none"]) },
      { k: "grid", v: mqPick("grid", ["1", "0"]), n: "1 = terminal/grid device" },
      { k: "print media", v: mq("print") },
      { k: "resolution (dppx)", v: probe(() => { for (const d of [1,1.25,1.5,2,2.5,3,4]) if (matchMedia(`(resolution: ${d}dppx)`).matches) return `${d}dppx`; return "other"; }) },
    ],
  };
}

/* ── 5. locale & time ────────────────────────────────────────── */

function localeSection(): Section {
  const dtf: any = probe(() => Intl.DateTimeFormat().resolvedOptions()) ?? {};
  const now = new Date();
  const jan = new Date(now.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(now.getFullYear(), 6, 1).getTimezoneOffset();
  const loc: any = probe(() => new (Intl as any).Locale(navigator.language));
  return {
    id: "locale",
    title: "Locale, Time & Region",
    note: "Timezone plus language ordering is one of the highest-entropy signals available without any permission prompt.",
    rows: [
      { k: "Intl timeZone", v: dtf.timeZone },
      { k: "Intl locale", v: dtf.locale },
      { k: "calendar", v: dtf.calendar },
      { k: "numberingSystem", v: dtf.numberingSystem },
      { k: "hourCycle", v: dtf.hourCycle ?? probe(() => Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hourCycle) },
      { k: "getTimezoneOffset()", v: probe(() => `${now.getTimezoneOffset()} min (UTC${now.getTimezoneOffset() <= 0 ? "+" : "-"}${Math.abs(now.getTimezoneOffset() / 60)})`) },
      { k: "offset in January", v: `${jan} min` },
      { k: "offset in July", v: `${jul} min` },
      { k: "observes DST", v: jan !== jul },
      { k: "client clock (ISO)", v: now.toISOString() },
      { k: "client clock (local)", v: now.toString() },
      { k: "Date.now()", v: Date.now() },
      { k: "performance.timeOrigin", v: probe(() => performance.timeOrigin) },
      { k: "session age at collection", v: probe(() => `${(performance.now() / 1000).toFixed(2)} s`) },
      { k: "number format sample", v: probe(() => (1234567.891).toLocaleString()) },
      { k: "currency sample", v: probe(() => (1234.5).toLocaleString(undefined, { style: "currency", currency: "USD" })) },
      { k: "date format sample", v: probe(() => now.toLocaleDateString()) },
      { k: "time format sample", v: probe(() => now.toLocaleTimeString()) },
      { k: "collator resolved", v: probe(() => JSON.stringify(new Intl.Collator().resolvedOptions())) },
      { k: "locale.weekInfo.firstDay", v: probe(() => loc?.weekInfo?.firstDay ?? loc?.getWeekInfo?.().firstDay) },
      { k: "locale.weekInfo.weekend", v: probe(() => list(loc?.weekInfo?.weekend ?? loc?.getWeekInfo?.().weekend)) },
      { k: "locale.hourCycles", v: probe(() => list(loc?.hourCycles ?? loc?.getHourCycles?.())) },
      { k: "locale.timeZones", v: probe(() => list(loc?.timeZones ?? loc?.getTimeZones?.())) },
      { k: "Intl.supportedValuesOf('timeZone')", v: probe(() => `${(Intl as any).supportedValuesOf("timeZone").length} zones known`) },
      { k: "Intl.supportedValuesOf('currency')", v: probe(() => `${(Intl as any).supportedValuesOf("currency").length} currencies known`) },
    ],
  };
}

/* ── 6. document, location & history ─────────────────────────── */

function documentSection(): Section {
  const d = document as any;
  const cookies = probe(() => (document.cookie ? document.cookie.split("; ") : []));
  return {
    id: "document",
    title: "Document, Location & History",
    note: "Where this page sits: its URL, what linked here, whether it is framed, and the ambient document state.",
    rows: [
      { k: "location.href", v: probe(() => location.href) },
      { k: "location.protocol", v: probe(() => location.protocol) },
      { k: "location.host", v: probe(() => location.host) },
      { k: "location.hostname", v: probe(() => location.hostname) },
      { k: "location.port", v: probe(() => location.port) },
      { k: "location.pathname", v: probe(() => location.pathname) },
      { k: "location.search", v: probe(() => location.search) },
      { k: "location.hash", v: probe(() => location.hash) },
      { k: "origin", v: probe(() => location.origin) },
      { k: "document.referrer", v: probe(() => document.referrer) },
      { k: "document.title", v: probe(() => document.title) },
      { k: "document.characterSet", v: probe(() => document.characterSet) },
      { k: "document.contentType", v: probe(() => d.contentType) },
      { k: "document.compatMode", v: probe(() => document.compatMode) },
      { k: "document.readyState", v: probe(() => document.readyState) },
      { k: "document.visibilityState", v: probe(() => document.visibilityState) },
      { k: "document.hasFocus()", v: probe(() => document.hasFocus()) },
      { k: "document.designMode", v: probe(() => d.designMode) },
      { k: "document.lastModified", v: probe(() => document.lastModified) },
      { k: "document.cookie count", v: Array.isArray(cookies) ? cookies.length : cookies },
      { k: "document.cookie names", v: Array.isArray(cookies) ? cookies.map((c: string) => c.split("=")[0]).join(", ") : cookies },
      { k: "history.length", v: probe(() => history.length), n: "entries in this tab" },
      { k: "history.scrollRestoration", v: probe(() => history.scrollRestoration) },
      { k: "window.name", v: probe(() => window.name) },
      { k: "is framed (top !== self)", v: probe(() => top !== self) },
      { k: "window.opener present", v: probe(() => opener !== null) },
      { k: "isSecureContext", v: probe(() => isSecureContext) },
      { k: "crossOriginIsolated", v: probe(() => w().crossOriginIsolated) },
      { k: "document.fullscreenEnabled", v: probe(() => document.fullscreenEnabled) },
      { k: "activeElement", v: probe(() => document.activeElement?.tagName) },
    ],
  };
}

/* ── 7. network ──────────────────────────────────────────────── */

async function networkSection(): Promise<Section> {
  const c = n().connection ?? n().mozConnection ?? n().webkitConnection;
  const ips = await probeAsync(() => localIPs(), 2500);
  return {
    id: "network",
    title: "Network",
    note: "Connection quality is reported by the Network Information API (Chromium). Local IPs are gathered by asking WebRTC for ICE candidates — browsers now usually return an mDNS placeholder instead of the real LAN address.",
    rows: [
      { k: "navigator.onLine", v: probe(() => navigator.onLine) },
      { k: "connection.effectiveType", v: probe(() => c?.effectiveType) },
      { k: "connection.type", v: probe(() => c?.type) },
      { k: "connection.downlink", v: probe(() => (c?.downlink != null ? `${c.downlink} Mb/s` : undefined)) },
      { k: "connection.downlinkMax", v: probe(() => c?.downlinkMax) },
      { k: "connection.rtt", v: probe(() => (c?.rtt != null ? `${c.rtt} ms` : undefined)) },
      { k: "connection.saveData", v: probe(() => c?.saveData) },
      { k: "WebRTC local candidates", v: ips },
    ],
  };
}

function localIPs(): Promise<string> {
  return new Promise((resolve) => {
    const RTC = w().RTCPeerConnection;
    if (!RTC) return resolve("RTCPeerConnection unsupported");
    const pc = new RTC({ iceServers: [] });
    const found = new Set<string>();
    pc.createDataChannel("x");
    pc.onicecandidate = (e: any) => {
      if (!e.candidate) {
        pc.close();
        return resolve(found.size ? [...found].join(", ") : "none gathered");
      }
      const m = /([0-9]{1,3}(?:\.[0-9]{1,3}){3}|[a-f0-9]{8}-[a-f0-9-]+\.local|[a-f0-9:]{10,})/i.exec(
        e.candidate.candidate
      );
      if (m) found.add(m[1]);
    };
    pc.createOffer().then((o: any) => pc.setLocalDescription(o)).catch(() => {});
    setTimeout(() => {
      try { pc.close(); } catch {}
      resolve(found.size ? [...found].join(", ") : "none gathered");
    }, 2000);
  });
}

/* ── 8. hardware & device APIs ───────────────────────────────── */

async function hardwareSection(): Promise<Section> {
  const nv = n();
  const rows: Row[] = [
    { k: "hardwareConcurrency", v: probe(() => nv.hardwareConcurrency) },
    { k: "deviceMemory", v: probe(() => (nv.deviceMemory ? `${nv.deviceMemory} GiB` : undefined)) },
    { k: "maxTouchPoints", v: probe(() => nv.maxTouchPoints) },
    { k: "touch events supported", v: probe(() => "ontouchstart" in window) },
    { k: "gamepads connected", v: probe(() => nv.getGamepads?.().filter(Boolean).length) },
    { k: "navigator.bluetooth", v: probe(() => (nv.bluetooth ? "present" : undefined)) },
    { k: "navigator.usb", v: probe(() => (nv.usb ? "present" : undefined)) },
    { k: "navigator.serial", v: probe(() => (nv.serial ? "present" : undefined)) },
    { k: "navigator.hid", v: probe(() => (nv.hid ? "present" : undefined)) },
    { k: "navigator.wakeLock", v: probe(() => (nv.wakeLock ? "present" : undefined)) },
    { k: "navigator.vibrate", v: probe(() => (nv.vibrate ? "present" : undefined)) },
    { k: "navigator.share", v: probe(() => (nv.share ? "present" : undefined)) },
    { k: "navigator.ink", v: probe(() => (nv.ink ? "present" : undefined)) },
    { k: "navigator.virtualKeyboard", v: probe(() => (nv.virtualKeyboard ? "present" : undefined)) },
    { k: "navigator.keyboard", v: probe(() => (nv.keyboard ? "present" : undefined)) },
  ];

  const bat: any = await probeAsync(() => nv.getBattery?.() ?? Promise.resolve(undefined), 1500);
  if (bat && typeof bat === "object") {
    rows.push(
      { k: "battery.level", v: `${Math.round(bat.level * 100)}%` },
      { k: "battery.charging", v: bat.charging },
      { k: "battery.chargingTime", v: bat.chargingTime === Infinity ? "∞" : `${bat.chargingTime} s` },
      { k: "battery.dischargingTime", v: bat.dischargingTime === Infinity ? "∞" : `${bat.dischargingTime} s` }
    );
  } else {
    rows.push({ k: "Battery Status API", v: bat ?? undefined, n: "removed in Firefox/Safari" });
  }

  const kb: any = await probeAsync(() => nv.keyboard?.getLayoutMap?.() ?? Promise.resolve(undefined), 1500);
  if (kb && typeof kb === "object" && kb.size !== undefined) {
    rows.push(
      { k: "keyboard layout size", v: kb.size },
      { k: "key 'KeyQ' maps to", v: kb.get?.("KeyQ") },
      { k: "key 'KeyA' maps to", v: kb.get?.("KeyA") },
      { k: "key 'KeyZ' maps to", v: kb.get?.("KeyZ") },
      { k: "key 'Semicolon' maps to", v: kb.get?.("Semicolon") }
    );
  }

  for (const mode of ["immersive-vr", "immersive-ar", "inline"]) {
    rows.push({
      k: `xr.isSessionSupported('${mode}')`,
      v: await probeAsync(() => nv.xr?.isSessionSupported?.(mode) ?? Promise.resolve(undefined), 1500),
    });
  }

  return {
    id: "hardware",
    title: "Hardware & Device APIs",
    note: "What the machine reports about itself, and which device-access APIs this browser exposes at all (presence alone, no permission requested).",
    rows,
  };
}

/* ── 9. storage ──────────────────────────────────────────────── */

async function storageSection(): Promise<Section> {
  const rows: Row[] = [];
  const est: any = await probeAsync(() => n().storage?.estimate?.() ?? Promise.resolve(undefined));
  if (est && typeof est === "object") {
    rows.push(
      { k: "storage.quota", v: bytes(est.quota) },
      { k: "storage.usage", v: bytes(est.usage) },
      { k: "usage / quota", v: est.quota ? `${((est.usage / est.quota) * 100).toFixed(4)}%` : undefined }
    );
    for (const [k, v] of Object.entries(est.usageDetails ?? {}))
      rows.push({ k: `usageDetails.${k}`, v: bytes(v) });
  } else {
    rows.push({ k: "storage.estimate()", v: est });
  }

  rows.push(
    { k: "storage.persisted()", v: await probeAsync(() => n().storage?.persisted?.() ?? Promise.resolve(undefined)) },
    { k: "localStorage available", v: probe(() => !!localStorage) },
    { k: "localStorage items", v: probe(() => localStorage.length) },
    { k: "localStorage keys", v: probe(() => Object.keys(localStorage).join(", ")) },
    { k: "sessionStorage available", v: probe(() => !!sessionStorage) },
    { k: "sessionStorage items", v: probe(() => sessionStorage.length) },
    { k: "sessionStorage keys", v: probe(() => Object.keys(sessionStorage).join(", ")) },
    { k: "indexedDB available", v: probe(() => !!indexedDB) },
    {
      k: "indexedDB databases",
      v: await probeAsync(async () => {
        const dbs = await (indexedDB as any).databases?.();
        return dbs ? dbs.map((d: any) => `${d.name} (v${d.version})`).join(", ") || "none" : undefined;
      }),
    },
    {
      k: "cacheStorage keys",
      v: await probeAsync(async () => {
        const keys = await w().caches?.keys?.();
        return keys ? keys.join(", ") || "none" : undefined;
      }),
    },
    {
      k: "cookieStore entries",
      v: await probeAsync(async () => {
        const all = await w().cookieStore?.getAll?.();
        return all ? all.length : undefined;
      }),
    },
    {
      k: "service workers registered",
      v: await probeAsync(async () => {
        const regs = await n().serviceWorker?.getRegistrations?.();
        return regs ? regs.length : undefined;
      }),
    },
    { k: "document.hasStorageAccess()", v: await probeAsync(() => (document as any).hasStorageAccess?.() ?? Promise.resolve(undefined)) }
  );

  return {
    id: "storage",
    title: "Storage",
    note: "Origin-scoped storage. Quota is derived from free disk space, which makes it a surprisingly identifying number on its own.",
    rows,
  };
}

/* ── 10. graphics ────────────────────────────────────────────── */

async function graphicsSection(): Promise<Section> {
  const rows: Row[] = [];

  for (const [label, ctxName] of [["WebGL 1", "webgl"], ["WebGL 2", "webgl2"]] as const) {
    // A canvas can only ever hold one context type, so each probe needs its own.
    const gl: any = probe(() => document.createElement("canvas").getContext(ctxName));
    if (!gl || typeof gl === "string") {
      rows.push({ k: `${label}`, v: gl ? String(gl) : undefined });
      continue;
    }
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    rows.push(
      { k: `${label} · VERSION`, v: gl.getParameter(gl.VERSION) },
      { k: `${label} · SHADING_LANGUAGE_VERSION`, v: gl.getParameter(gl.SHADING_LANGUAGE_VERSION) },
      { k: `${label} · VENDOR`, v: gl.getParameter(gl.VENDOR) },
      { k: `${label} · RENDERER`, v: gl.getParameter(gl.RENDERER) },
      { k: `${label} · UNMASKED_VENDOR`, v: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : undefined, n: "real GPU vendor" },
      { k: `${label} · UNMASKED_RENDERER`, v: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : undefined, n: "real GPU model" },
      { k: `${label} · MAX_TEXTURE_SIZE`, v: gl.getParameter(gl.MAX_TEXTURE_SIZE) },
      { k: `${label} · MAX_VIEWPORT_DIMS`, v: Array.from(gl.getParameter(gl.MAX_VIEWPORT_DIMS) ?? []).join(" × ") },
      { k: `${label} · MAX_RENDERBUFFER_SIZE`, v: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) },
      { k: `${label} · MAX_VERTEX_ATTRIBS`, v: gl.getParameter(gl.MAX_VERTEX_ATTRIBS) },
      { k: `${label} · MAX_TEXTURE_IMAGE_UNITS`, v: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) },
      { k: `${label} · ALIASED_LINE_WIDTH_RANGE`, v: Array.from(gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE) ?? []).join(" – ") },
      { k: `${label} · antialias`, v: gl.getContextAttributes?.()?.antialias },
      { k: `${label} · extensions`, v: gl.getSupportedExtensions()?.length },
      { k: `${label} · extension list`, v: gl.getSupportedExtensions()?.join(", ") }
    );
  }

  const gpu = n().gpu;
  if (gpu) {
    const info: any = await probeAsync(async () => {
      const adapter = await gpu.requestAdapter();
      if (!adapter) return "no adapter";
      const ai = adapter.info ?? (await adapter.requestAdapterInfo?.());
      return {
        vendor: ai?.vendor, architecture: ai?.architecture,
        device: ai?.device, description: ai?.description,
        features: [...adapter.features].length,
        maxTextureDimension2D: adapter.limits?.maxTextureDimension2D,
        maxBufferSize: adapter.limits?.maxBufferSize,
      };
    }, 4000);
    if (info && typeof info === "object") {
      for (const [k, v] of Object.entries(info)) rows.push({ k: `WebGPU · ${k}`, v: v ?? "(hidden)" });
    } else {
      rows.push({ k: "WebGPU adapter", v: info });
    }
  } else {
    rows.push({ k: "WebGPU", v: undefined });
  }

  return {
    id: "graphics",
    title: "Graphics & GPU",
    note: "The GPU driver string is among the most identifying values a page can read without any prompt — it names the exact chip and driver build.",
    rows,
  };
}

/* ── 11. fingerprints ────────────────────────────────────────── */

async function fingerprintSection(): Promise<Section> {
  return {
    id: "fingerprints",
    title: "Rendering Fingerprints",
    note: "Digests of how this machine rasterises graphics and processes audio. Identical hardware + driver + browser builds produce identical hashes; small differences change them completely.",
    rows: [
      { k: "canvas 2D hash", v: probe(() => canvasFingerprint()) },
      { k: "canvas 2D data length", v: probe(() => canvasDataURL().length) },
      { k: "WebGL render hash", v: probe(() => webglFingerprint()) },
      { k: "audio DSP hash", v: await probeAsync(() => audioFingerprint(), 4000) },
      { k: "math/engine hash", v: probe(() => mathFingerprint()) },
      { k: "installed-font hash", v: probe(() => hash(detectFonts().join(","))) },
    ],
  };
}

function canvasDataURL(): string {
  const c = document.createElement("canvas");
  c.width = 280; c.height = 60;
  const ctx = c.getContext("2d")!;
  ctx.textBaseline = "top";
  ctx.font = "14px 'Arial'";
  ctx.fillStyle = "#f60";
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = "#069";
  ctx.fillText("Session context \u{1F512} éèê", 2, 15);
  ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
  ctx.fillText("Session context \u{1F512} éèê", 4, 25);
  ctx.globalCompositeOperation = "multiply";
  for (const [color, x] of [["#f2f", 50], ["#2ff", 100], ["#ff2", 75]] as const) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, 40, 20, 0, Math.PI * 2, true);
    ctx.fill();
  }
  return c.toDataURL();
}

function canvasFingerprint(): string {
  return hash(canvasDataURL());
}

function webglFingerprint(): string {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const gl: any = c.getContext("webgl");
  if (!gl) return "unsupported";
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);gl_PointSize=64.;}");
  gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, "precision mediump float;void main(){gl_FragColor=vec4(gl_PointCoord.x,gl_PointCoord.y,.5,1.);}");
  gl.compileShader(fs);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 0.4, 0.2, -0.3, 0.5]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.POINTS, 0, 3);
  const px = new Uint8Array(128 * 128 * 4);
  gl.readPixels(0, 0, 128, 128, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return hash(px.join(""));
}

async function audioFingerprint(): Promise<string> {
  const OAC = w().OfflineAudioContext ?? w().webkitOfflineAudioContext;
  if (!OAC) return "unsupported";
  const ctx = new OAC(1, 44100, 44100);
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = 10000;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -50;
  comp.knee.value = 40;
  comp.ratio.value = 12;
  comp.attack.value = 0;
  comp.release.value = 0.25;
  osc.connect(comp);
  comp.connect(ctx.destination);
  osc.start(0);
  const buf = await ctx.startRendering();
  const data = buf.getChannelData(0);
  let sum = 0;
  for (let i = 4500; i < 5000; i++) sum += Math.abs(data[i]);
  return `${hash(String(sum))} (sum ${sum.toFixed(10)})`;
}

function mathFingerprint(): string {
  const ops = [
    Math.acos(0.123456789), Math.asin(0.123456789), Math.atan(2), Math.sin(1e10),
    Math.cos(1e10), Math.tan(-1e300), Math.exp(1), Math.log(1e10),
    Math.sinh(1), Math.cosh(1), Math.tanh(1), Math.expm1(1), Math.log1p(10),
    Math.pow(Math.PI, -100), 1e300 * 1e300 - 1e300 * 1e300,
  ];
  return hash(ops.join(","));
}

/* ── 12. fonts ───────────────────────────────────────────────── */

const FONT_PROBES = [
  "Arial", "Arial Black", "Arial Narrow", "Arial Rounded MT Bold", "Bookman Old Style",
  "Bradley Hand ITC", "Century Gothic", "Comic Sans MS", "Courier", "Courier New",
  "Georgia", "Gentium", "Impact", "King", "Lucida Console", "Lalit", "Modena",
  "Monotype Corsiva", "Papyrus", "Tahoma", "TeX", "Times", "Times New Roman",
  "Trebuchet MS", "Verdana", "Verona", "Helvetica", "Helvetica Neue", "Segoe UI",
  "Calibri", "Cambria", "Candara", "Consolas", "Constantia", "Corbel", "Franklin Gothic Medium",
  "Gabriola", "Palatino Linotype", "Sylfaen", "Menlo", "Monaco", "SF Pro Text",
  "SF Mono", "Optima", "Futura", "Gill Sans", "Baskerville", "American Typewriter",
  "Andale Mono", "Avenir", "Chalkboard", "Copperplate", "Didot", "Herculanum",
  "Hoefler Text", "Marker Felt", "Noteworthy", "Rockwell", "Savoye LET", "Skia",
  "Roboto", "Ubuntu", "Cantarell", "DejaVu Sans", "Liberation Sans", "Noto Sans",
  "FreeSans", "Nimbus Sans", "Droid Sans", "Oxygen", "Fira Sans", "Inter",
];

function detectFonts(): string[] {
  const base = ["monospace", "sans-serif", "serif"];
  const text = "mmmmmmmmmmlli\u{4E2D}\u{6587}";
  const size = "72px";
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  const baseWidths: Record<string, number> = {};
  for (const b of base) {
    ctx.font = `${size} ${b}`;
    baseWidths[b] = ctx.measureText(text).width;
  }
  const found: string[] = [];
  for (const f of FONT_PROBES) {
    for (const b of base) {
      ctx.font = `${size} '${f}', ${b}`;
      if (ctx.measureText(text).width !== baseWidths[b]) {
        found.push(f);
        break;
      }
    }
  }
  return found;
}

function fontsSection(): Section {
  const found = probe(() => detectFonts());
  const arr = Array.isArray(found) ? found : [];
  return {
    id: "fonts",
    title: "Fonts",
    note: `Detected by measuring text width against the three generic families — no permission needed. ${FONT_PROBES.length} common faces probed.`,
    rows: [
      { k: "fonts probed", v: FONT_PROBES.length },
      { k: "fonts detected", v: Array.isArray(found) ? found.length : found },
      { k: "detected list", v: arr.join(", ") },
      { k: "not detected", v: FONT_PROBES.filter((f) => !arr.includes(f)).join(", ") },
      { k: "document.fonts.size", v: probe(() => (document as any).fonts?.size), n: "webfonts on this page" },
      { k: "document.fonts.status", v: probe(() => (document as any).fonts?.status) },
      { k: "queryLocalFonts API", v: probe(() => (w().queryLocalFonts ? "present (permission-gated)" : undefined)) },
    ],
  };
}

/* ── 13. audio stack ─────────────────────────────────────────── */

function audioSection(): Section {
  const AC = w().AudioContext ?? w().webkitAudioContext;
  let ctx: any;
  const rows: Row[] = [];
  try {
    ctx = AC ? new AC() : undefined;
  } catch {
    ctx = undefined;
  }
  rows.push(
    { k: "AudioContext", v: AC ? "supported" : undefined },
    { k: "sampleRate", v: probe(() => ctx?.sampleRate) },
    { k: "state", v: probe(() => ctx?.state), n: "suspended until user gesture" },
    { k: "baseLatency", v: probe(() => ctx?.baseLatency) },
    { k: "outputLatency", v: probe(() => ctx?.outputLatency) },
    { k: "destination.maxChannelCount", v: probe(() => ctx?.destination?.maxChannelCount) },
    { k: "destination.channelCount", v: probe(() => ctx?.destination?.channelCount) },
    { k: "destination.channelInterpretation", v: probe(() => ctx?.destination?.channelInterpretation) },
    { k: "listener present", v: probe(() => !!ctx?.listener) },
    { k: "speechSynthesis voices", v: probe(() => w().speechSynthesis?.getVoices?.().length) },
    { k: "voice list", v: probe(() => w().speechSynthesis?.getVoices?.().map((v: any) => `${v.name} [${v.lang}]${v.default ? " *" : ""}`).join(", ")) },
  );
  try { ctx?.close?.(); } catch {}
  return {
    id: "audio",
    title: "Audio Stack",
    note: "Sample rate and channel count come from the actual output device. The installed speech-synthesis voice list is strongly OS- and locale-specific.",
    rows,
  };
}

/* ── 14. codecs & DRM ────────────────────────────────────────── */

const VIDEO_CODECS = [
  'video/mp4; codecs="avc1.42E01E"',
  'video/mp4; codecs="hvc1.1.6.L93.B0"',
  'video/mp4; codecs="av01.0.05M.08"',
  'video/mp4; codecs="vp09.00.10.08"',
  'video/webm; codecs="vp8"',
  'video/webm; codecs="vp9"',
  'video/webm; codecs="av01.0.05M.08"',
  "video/ogg",
  "application/vnd.apple.mpegurl",
];
const AUDIO_CODECS = [
  'audio/mp4; codecs="mp4a.40.2"',
  "audio/mpeg",
  'audio/webm; codecs="opus"',
  'audio/webm; codecs="vorbis"',
  "audio/ogg",
  "audio/flac",
  "audio/wav",
  'audio/mp4; codecs="ec-3"',
];
const KEY_SYSTEMS = [
  "com.widevine.alpha",
  "com.microsoft.playready.recommendation",
  "com.apple.fps",
  "com.apple.fps.1_0",
  "org.w3.clearkey",
];

async function codecSection(): Promise<Section> {
  const video = document.createElement("video");
  const audio = document.createElement("audio");
  const rows: Row[] = [];

  for (const c of VIDEO_CODECS)
    rows.push({ k: `video canPlayType · ${c}`, v: probe(() => video.canPlayType(c) || "no") });
  for (const c of AUDIO_CODECS)
    rows.push({ k: `audio canPlayType · ${c}`, v: probe(() => audio.canPlayType(c) || "no") });

  rows.push({
    k: "MediaSource supported types",
    v: probe(() =>
      VIDEO_CODECS.filter((c) => w().MediaSource?.isTypeSupported?.(c)).join(", ") || "none"
    ),
  });
  rows.push({
    k: "MediaRecorder supported types",
    v: probe(() =>
      [
        "video/webm", 'video/webm;codecs="vp8"', 'video/webm;codecs="vp9"',
        'video/webm;codecs="h264"', "video/mp4", "audio/webm", 'audio/webm;codecs="opus"', "audio/mp4",
      ].filter((t) => w().MediaRecorder?.isTypeSupported?.(t)).join(", ") || "none"
    ),
  });

  for (const ks of KEY_SYSTEMS) {
    rows.push({
      k: `EME · ${ks}`,
      v: await probeAsync(async () => {
        if (!n().requestMediaKeySystemAccess) return undefined;
        await n().requestMediaKeySystemAccess(ks, [
          {
            initDataTypes: ["cenc"],
            videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"' }],
          },
        ]);
        return "available";
      }, 2500),
    });
  }

  return {
    id: "codecs",
    title: "Codecs & DRM",
    note: "Which media formats decode here and which DRM key systems the device supports. Hardware-accelerated codec support closely tracks the specific chipset.",
    rows,
  };
}

/* ── 15. media devices ───────────────────────────────────────── */

async function devicesSection(): Promise<Section> {
  const devs: any = await probeAsync(
    () => n().mediaDevices?.enumerateDevices?.() ?? Promise.resolve(undefined),
    3000
  );
  const rows: Row[] = [];
  if (Array.isArray(devs)) {
    const byKind = (k: string) => devs.filter((d: any) => d.kind === k).length;
    rows.push(
      { k: "devices total", v: devs.length },
      { k: "audioinput", v: byKind("audioinput") },
      { k: "audiooutput", v: byKind("audiooutput") },
      { k: "videoinput", v: byKind("videoinput") }
    );
    devs.forEach((d: any, i: number) =>
      rows.push({
        k: `device[${i}]`,
        v: `${d.kind} — ${d.label || "(label hidden)"}`,
        n: d.deviceId ? `id ${d.deviceId.slice(0, 12)}…` : "no id until permitted",
      })
    );
  } else {
    rows.push({ k: "enumerateDevices()", v: devs });
  }
  rows.push(
    { k: "getSupportedConstraints", v: probe(() => Object.keys(n().mediaDevices?.getSupportedConstraints?.() ?? {}).join(", ")) },
    { k: "getDisplayMedia", v: probe(() => (n().mediaDevices?.getDisplayMedia ? "present" : undefined)) }
  );
  return {
    id: "devices",
    title: "Media Devices",
    note: "Device count is visible without permission; labels and stable IDs only appear after camera/microphone access is granted. Use the button at the top to grant it and re-collect.",
    rows,
  };
}

/* ── 16. permissions ─────────────────────────────────────────── */

const PERMISSIONS = [
  "geolocation", "notifications", "camera", "microphone", "clipboard-read",
  "clipboard-write", "persistent-storage", "midi", "background-sync", "push",
  "accelerometer", "gyroscope", "magnetometer", "ambient-light-sensor",
  "payment-handler", "screen-wake-lock", "local-fonts", "window-management",
  "idle-detection", "speaker-selection", "storage-access", "top-level-storage-access",
  "bluetooth", "nfc", "display-capture", "captured-surface-control",
];

async function permissionsSection(): Promise<Section> {
  const rows: Row[] = [
    { k: "Notification.permission", v: probe(() => w().Notification?.permission) },
  ];
  for (const name of PERMISSIONS) {
    const state = await probeAsync(async () => {
      const r = await n().permissions?.query?.({ name } as any);
      return r?.state;
    }, 1500);
    rows.push({
      k: name,
      v: typeof state === "string" && state.startsWith("error:") ? "not queryable" : state,
    });
  }
  return {
    id: "permissions",
    title: "Permissions",
    note: "Current state of every queryable permission, read without prompting. 'prompt' means undecided; 'not queryable' means this browser does not expose that name.",
    rows,
  };
}

/* ── 17. performance & navigation timing ─────────────────────── */

function performanceSection(): Section {
  const nav: any = probe(() => performance.getEntriesByType("navigation")[0]);
  const paints: any = probe(() => performance.getEntriesByType("paint"));
  const mem: any = (performance as any).memory;
  const rows: Row[] = [
    { k: "navigation.type", v: nav?.type },
    { k: "navigation.redirectCount", v: nav?.redirectCount },
    { k: "nextHopProtocol", v: nav?.nextHopProtocol },
    { k: "redirect time", v: ms(nav?.redirectEnd - nav?.redirectStart) },
    { k: "DNS lookup", v: ms(nav?.domainLookupEnd - nav?.domainLookupStart) },
    { k: "TCP connect", v: ms(nav?.connectEnd - nav?.connectStart) },
    { k: "TLS negotiation", v: nav?.secureConnectionStart ? ms(nav.connectEnd - nav.secureConnectionStart) : "n/a" },
    { k: "request → first byte", v: ms(nav?.responseStart - nav?.requestStart) },
    { k: "response download", v: ms(nav?.responseEnd - nav?.responseStart) },
    { k: "DOM interactive", v: ms(nav?.domInteractive) },
    { k: "DOMContentLoaded", v: ms(nav?.domContentLoadedEventEnd) },
    { k: "load event end", v: ms(nav?.loadEventEnd) },
    { k: "transferSize", v: bytes(nav?.transferSize) },
    { k: "encodedBodySize", v: bytes(nav?.encodedBodySize) },
    { k: "decodedBodySize", v: bytes(nav?.decodedBodySize) },
    { k: "deliveryType", v: nav?.deliveryType || "(network)" },
    { k: "activationStart", v: nav?.activationStart, n: "non-zero if prerendered" },
  ];
  if (Array.isArray(paints)) for (const p of paints) rows.push({ k: p.name, v: ms(p.startTime) });
  rows.push(
    { k: "resource entries", v: probe(() => performance.getEntriesByType("resource").length) },
    { k: "performance.now() precision", v: probe(() => clockPrecision()), n: "coarsened against timing attacks" },
    { k: "memory.jsHeapSizeLimit", v: bytes(mem?.jsHeapSizeLimit) },
    { k: "memory.totalJSHeapSize", v: bytes(mem?.totalJSHeapSize) },
    { k: "memory.usedJSHeapSize", v: bytes(mem?.usedJSHeapSize) }
  );
  return {
    id: "performance",
    title: "Performance & Navigation Timing",
    note: "How this very page load went, phase by phase, from the browser's own instrumentation.",
    rows,
  };
}

const ms = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(1)} ms` : undefined;

function clockPrecision(): string {
  let min = Infinity;
  let prev = performance.now();
  for (let i = 0; i < 50000; i++) {
    const t = performance.now();
    const d = t - prev;
    if (d > 0 && d < min) min = d;
    prev = t;
  }
  return Number.isFinite(min) ? `${min.toFixed(6)} ms` : "unmeasurable";
}

/* ── 18. JS engine & runtime ─────────────────────────────────── */

function engineSection(): Section {
  const err = probe(() => {
    try { (null as any).x.toString(); } catch (e) { return (e as Error).message; }
    return "n/a";
  });
  return {
    id: "engine",
    title: "JavaScript Engine & Runtime",
    note: "Engine tells reflect the exact JS implementation — error wording and numeric edge cases differ between V8, SpiderMonkey and JavaScriptCore even when the UA string is spoofed.",
    rows: [
      { k: "TypeError message style", v: err, n: "V8 / SpiderMonkey / JSC differ" },
      { k: "Error.stack format", v: probe(() => new Error("x").stack?.split("\n")[1]?.trim()) },
      { k: "Error.captureStackTrace", v: probe(() => ("captureStackTrace" in Error ? "present (V8)" : undefined)) },
      { k: "Function.toString of native", v: probe(() => Function.prototype.toString.call(Math.max)) },
      { k: "0.1 + 0.2", v: 0.1 + 0.2 },
      { k: "Number.MAX_SAFE_INTEGER", v: Number.MAX_SAFE_INTEGER },
      { k: "toFixed rounding (1.005)", v: probe(() => (1.005).toFixed(2)) },
      { k: "Array.sort stability marker", v: probe(() => [3, 1, 2].sort().join("")) },
      { k: "Intl present", v: typeof Intl !== "undefined" },
      { k: "BigInt", v: typeof BigInt !== "undefined" },
      { k: "WeakRef", v: typeof w().WeakRef !== "undefined" },
      { k: "FinalizationRegistry", v: typeof w().FinalizationRegistry !== "undefined" },
      { k: "structuredClone", v: typeof w().structuredClone !== "undefined" },
      { k: "SharedArrayBuffer", v: typeof w().SharedArrayBuffer !== "undefined", n: "needs cross-origin isolation" },
      { k: "Atomics", v: typeof w().Atomics !== "undefined" },
      { k: "WebAssembly", v: typeof w().WebAssembly !== "undefined" },
      { k: "Wasm SIMD", v: probe(() => w().WebAssembly?.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]))) },
      { k: "eval allowed (CSP)", v: probe(() => { try { (0, eval)("1"); return true; } catch { return false; } }) },
      { k: "globalThis keys", v: probe(() => Object.getOwnPropertyNames(globalThis).length) },
      { k: "toSource (Firefox)", v: probe(() => ("toSource" in Object.prototype ? "present" : undefined)) },
      { k: "chrome object", v: probe(() => (w().chrome ? Object.keys(w().chrome).join(", ") || "present (empty)" : undefined)) },
      { k: "window.safari", v: probe(() => (w().safari ? "present" : undefined)) },
      { k: "process/electron", v: probe(() => (w().process?.versions ? JSON.stringify(w().process.versions) : undefined)) },
    ],
  };
}

/* ── 19. feature matrix ──────────────────────────────────────── */

const FEATURES: [string, () => boolean][] = [
  ["ServiceWorker", () => "serviceWorker" in navigator],
  ["WebSocket", () => "WebSocket" in window],
  ["WebTransport", () => "WebTransport" in window],
  ["WebRTC", () => "RTCPeerConnection" in window],
  ["WebGL2", () => "WebGL2RenderingContext" in window],
  ["WebGPU", () => "gpu" in navigator],
  ["WebXR", () => "xr" in navigator],
  ["WebAuthn", () => "credentials" in navigator && "PublicKeyCredential" in window],
  ["WebCrypto (subtle)", () => !!(crypto as any)?.subtle],
  ["crypto.randomUUID", () => "randomUUID" in crypto],
  ["Credential Management", () => "credentials" in navigator],
  ["Payment Request", () => "PaymentRequest" in window],
  ["Push API", () => "PushManager" in window],
  ["Notification", () => "Notification" in window],
  ["Geolocation", () => "geolocation" in navigator],
  ["Clipboard API", () => "clipboard" in navigator],
  ["File System Access", () => "showOpenFilePicker" in window],
  ["EyeDropper", () => "EyeDropper" in window],
  ["Contact Picker", () => "contacts" in navigator],
  ["Idle Detection", () => "IdleDetector" in window],
  ["Screen Wake Lock", () => "wakeLock" in navigator],
  ["Window Management", () => "getScreenDetails" in window],
  ["Web Share", () => "share" in navigator],
  ["Web Share (files)", () => "canShare" in navigator],
  ["Background Fetch", () => "BackgroundFetchManager" in window],
  ["Periodic Sync", () => "PeriodicSyncManager" in window],
  ["Web Locks", () => "locks" in navigator],
  ["Broadcast Channel", () => "BroadcastChannel" in window],
  ["SharedWorker", () => "SharedWorker" in window],
  ["OffscreenCanvas", () => "OffscreenCanvas" in window],
  ["ImageCapture", () => "ImageCapture" in window],
  ["MediaRecorder", () => "MediaRecorder" in window],
  ["Picture-in-Picture", () => "pictureInPictureEnabled" in document],
  ["Speech Recognition", () => "SpeechRecognition" in window || "webkitSpeechRecognition" in window],
  ["Speech Synthesis", () => "speechSynthesis" in window],
  ["Sensors (Accelerometer)", () => "Accelerometer" in window],
  ["DeviceOrientation", () => "DeviceOrientationEvent" in window],
  ["Ambient Light", () => "AmbientLightSensor" in window],
  ["Gamepad", () => "getGamepads" in navigator],
  ["Pointer Lock", () => "pointerLockElement" in document],
  ["Fullscreen", () => "fullscreenEnabled" in document],
  ["Resize/Intersection Observer", () => "ResizeObserver" in window && "IntersectionObserver" in window],
  ["Reporting Observer", () => "ReportingObserver" in window],
  ["Performance Observer", () => "PerformanceObserver" in window],
  ["Navigation API", () => "navigation" in window],
  ["View Transitions", () => "startViewTransition" in document],
  ["Popover API", () => "popover" in HTMLElement.prototype],
  ["Dialog element", () => "HTMLDialogElement" in window],
  ["CSS Houdini (paintWorklet)", () => "paintWorklet" in (CSS as any)],
  ["container queries", () => CSS.supports("container-type: inline-size")],
  ["CSS :has()", () => CSS.supports("selector(:has(a))")],
  ["CSS nesting", () => CSS.supports("selector(&)")],
  ["color-mix()", () => CSS.supports("color: color-mix(in srgb, red, blue)")],
  ["oklch()", () => CSS.supports("color: oklch(0.5 0.1 200)")],
  ["backdrop-filter", () => CSS.supports("backdrop-filter: blur(1px)")],
  ["Trusted Types", () => "trustedTypes" in window],
  ["Topics API", () => "browsingTopics" in document],
  ["Attribution Reporting", () => "attributionReporting" in (window as any) || "attributionsrc" in HTMLAnchorElement.prototype],
  ["Private State Tokens", () => "hasPrivateToken" in document],
  ["Protected Audience (FLEDGE)", () => "runAdAuction" in navigator],
  ["Storage Access API", () => "requestStorageAccess" in document],
  ["Federated Credential (FedCM)", () => "IdentityCredential" in window],
];

function featuresSection(): Section {
  const rows = FEATURES.map(([name, test]) => ({ k: name, v: probe(test) }));
  const yes = rows.filter((r) => r.v === true).length;
  return {
    id: "features",
    title: "Feature Detection Matrix",
    note: `Presence of ${FEATURES.length} platform APIs. ${yes} available here — the exact combination narrows the browser, its version and its platform considerably.`,
    rows,
  };
}

/* ── 20. input & interaction ─────────────────────────────────── */

function interactionSection(): Section {
  return {
    id: "interaction",
    title: "Input & Interaction",
    note: "Observed live from this session — pointer, keyboard and window events since the page loaded. These figures update as you use the page.",
    rows: liveInteractionRows(),
  };
}

/** Mutable counters filled by listeners installed on first collection. */
const live = {
  installed: false,
  pointerMoves: 0,
  clicks: 0,
  keydowns: 0,
  scrolls: 0,
  focusChanges: 0,
  visibilityChanges: 0,
  resizes: 0,
  lastPointer: "none yet",
  lastPointerType: "none yet",
  maxPressure: 0,
  deviceOrientation: "no event received",
  deviceMotion: "no event received",
  /** recent pointer samples, for movement dynamics */
  path: [] as { x: number; y: number; t: number }[],
};

export function installLiveListeners() {
  if (live.installed) return;
  live.installed = true;
  addEventListener("pointermove", (e) => {
    live.pointerMoves++;
    live.lastPointer = `${Math.round(e.clientX)}, ${Math.round(e.clientY)}`;
    live.lastPointerType = `${e.pointerType} (w${e.width}×h${e.height}, tilt ${e.tiltX}/${e.tiltY})`;
    if (e.pressure > live.maxPressure) live.maxPressure = e.pressure;
    live.path.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (live.path.length > 600) live.path.shift();
  }, { passive: true });
  addEventListener("click", () => live.clicks++, { passive: true });
  addEventListener("keydown", () => live.keydowns++, { passive: true });
  addEventListener("scroll", () => live.scrolls++, { passive: true });
  addEventListener("focus", () => live.focusChanges++, { passive: true });
  addEventListener("blur", () => live.focusChanges++, { passive: true });
  addEventListener("resize", () => live.resizes++, { passive: true });
  document.addEventListener("visibilitychange", () => live.visibilityChanges++, { passive: true });
  addEventListener("deviceorientation", (e: any) => {
    live.deviceOrientation = `α ${e.alpha?.toFixed(1)} β ${e.beta?.toFixed(1)} γ ${e.gamma?.toFixed(1)}${e.absolute ? " (absolute)" : ""}`;
  }, { passive: true });
  addEventListener("devicemotion", (e: any) => {
    live.deviceMotion = `accel ${e.acceleration?.x?.toFixed(2)}/${e.acceleration?.y?.toFixed(2)}/${e.acceleration?.z?.toFixed(2)}, interval ${e.interval}`;
  }, { passive: true });
}

/**
 * Movement dynamics: how fast you move the pointer, how jerkily, and how
 * curved your path is. Stable enough per person to work as a soft biometric.
 */
export function mouseDynamics() {
  const p = live.path;
  if (p.length < 12) return undefined;
  const speeds: number[] = [];
  const angles: number[] = [];
  for (let i = 1; i < p.length; i++) {
    const dx = p[i].x - p[i - 1].x;
    const dy = p[i].y - p[i - 1].y;
    const dt = p[i].t - p[i - 1].t;
    if (dt <= 0) continue;
    speeds.push(Math.hypot(dx, dy) / dt);
    if (dx || dy) angles.push(Math.atan2(dy, dx));
  }
  if (speeds.length < 8) return undefined;
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const sd = (a: number[]) => {
    const m = mean(a);
    return Math.sqrt(mean(a.map((v) => (v - m) ** 2)));
  };
  const accel: number[] = [];
  for (let i = 1; i < speeds.length; i++) accel.push(Math.abs(speeds[i] - speeds[i - 1]));
  let turn = 0;
  for (let i = 1; i < angles.length; i++) {
    let d = Math.abs(angles[i] - angles[i - 1]);
    if (d > Math.PI) d = 2 * Math.PI - d;
    turn += d;
  }
  return {
    samples: speeds.length,
    meanSpeed: mean(speeds),
    sdSpeed: sd(speeds),
    meanAccel: mean(accel),
    curvature: turn / angles.length,
  };
}

/** Current values of the live counters, re-read on every render tick. */
export function liveInteractionRows(): Row[] {
  const d = mouseDynamics();
  return [
    { k: "pointermove events", v: live.pointerMoves },
    { k: "last pointer position", v: live.lastPointer },
    { k: "last pointer characteristics", v: live.lastPointerType },
    { k: "max pointer pressure", v: live.maxPressure },
    { k: "click events", v: live.clicks },
    { k: "keydown events", v: live.keydowns },
    { k: "scroll events", v: live.scrolls },
    { k: "focus/blur events", v: live.focusChanges },
    { k: "visibility changes", v: live.visibilityChanges },
    { k: "resize events", v: live.resizes },
    { k: "deviceorientation", v: live.deviceOrientation },
    { k: "devicemotion", v: live.deviceMotion },
    { k: "time on page", v: `${(performance.now() / 1000).toFixed(1)} s` },
    { k: "movement samples held", v: live.path.length, n: "rolling buffer of your cursor path" },
    { k: "mean pointer speed", v: d ? `${(d.meanSpeed * 1000).toFixed(0)} px/s` : undefined, n: "move the mouse to populate" },
    { k: "speed variability", v: d ? `${(d.sdSpeed * 1000).toFixed(0)} px/s` : undefined },
    { k: "mean acceleration", v: d ? d.meanAccel.toFixed(4) : undefined, n: "jerkiness of your hand" },
    { k: "path curvature", v: d ? `${d.curvature.toFixed(3)} rad/sample` : undefined, n: "straight lines vs arcs" },
  ];
}

/* ── orchestration ───────────────────────────────────────────── */

import {
  benchmarkSection, crossTabSection, mediaCapabilitiesSection, persistenceSection,
  systemUISection, tamperSection, thermalSection, workerSection,
} from "./advanced";
import { fingerprintSections, privacySection, uaParserSection } from "./libs";

import { PLACEMENT, SECTION_ORDER } from "./taxonomy";

/**
 * Collect in two passes so the page has something to show immediately: the
 * cheap probes land in a few hundred milliseconds, the expensive ones
 * (graphics, benchmarks, composite fingerprinting) follow.
 */
export async function collectAll(
  onPartial?: (sections: Section[]) => void
): Promise<Section[]> {
  installLiveListeners();

  const immediate = [
    navigatorSection(),
    screenSection(),
    preferencesSection(),
    localeSection(),
    documentSection(),
    engineSection(),
    featuresSection(),
    fontsSection(),
    audioSection(),
    performanceSection(),
    interactionSection(),
    uaParserSection(),
    tamperSection(),
  ];
  onPartial?.(sortSections(immediate));

  const quick = await Promise.all([
    uaDataSection(),
    networkSection(),
    hardwareSection(),
    storageSection(),
    devicesSection(),
    permissionsSection(),
    persistenceSection(),
    crossTabSection(),
    privacySection(),
  ]);
  onPartial?.(sortSections([...immediate, ...quick]));

  const heavy = await Promise.all([
    graphicsSection(),
    fingerprintSection(),
    codecSection(),
    workerSection(),
    systemUISection(),
    mediaCapabilitiesSection(),
    benchmarkSection(),
    thermalSection(),
  ]);
  onPartial?.(sortSections([...immediate, ...quick, ...heavy]));

  const fp = await fingerprintSections();
  return sortSections([...immediate, ...quick, ...heavy, ...fp]);
}

/** Attach category + subgroup from the taxonomy and sort into reading order. */
export function sortSections(sections: Section[]): Section[] {
  return sections
    .map((s) => {
      const [group, subgroup] = PLACEMENT[s.id] ?? ["Other", "Uncategorised"];
      return { ...s, group, subgroup };
    })
    .sort((a, b) => {
      const ia = SECTION_ORDER.indexOf(a.id);
      const ib = SECTION_ORDER.indexOf(b.id);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
}

/* ── on-demand probes (require a user gesture / permission) ──── */

export async function probeGeolocation(): Promise<Section> {
  const pos: any = await probeAsync(
    () =>
      new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      ),
    12000
  );
  const c = pos?.coords;
  return {
    id: "geolocation",
    title: "Geolocation (granted)",
    note: "Device position as reported by the OS location service.",
    rows: c
      ? [
          { k: "latitude", v: c.latitude },
          { k: "longitude", v: c.longitude },
          { k: "accuracy", v: `${c.accuracy} m` },
          { k: "altitude", v: c.altitude },
          { k: "altitudeAccuracy", v: c.altitudeAccuracy },
          { k: "heading", v: c.heading },
          { k: "speed", v: c.speed },
          { k: "timestamp", v: new Date(pos.timestamp).toISOString() },
        ]
      : [{ k: "getCurrentPosition()", v: String(pos ?? "denied") }],
  };
}

export async function probeLocalFonts(): Promise<Section> {
  const fonts: any = await probeAsync(() => w().queryLocalFonts?.() ?? Promise.resolve(undefined), 15000);
  const rows: Row[] = Array.isArray(fonts)
    ? [
        { k: "fonts installed", v: fonts.length },
        { k: "families", v: [...new Set(fonts.map((f: any) => f.family))].length },
        { k: "full list", v: fonts.map((f: any) => f.fullName).join(", ") },
      ]
    : [{ k: "queryLocalFonts()", v: fonts }];
  return {
    id: "local-fonts",
    title: "Local Fonts (granted)",
    note: "The complete installed font set, straight from the OS — far more precise than width-measurement detection.",
    rows,
  };
}

export async function probeDeviceLabels(): Promise<Section> {
  const res: any = await probeAsync(async () => {
    const stream = await n().mediaDevices.getUserMedia({ audio: true, video: true });
    const tracks = stream.getTracks();
    const settings = tracks.map((t: any) => ({
      kind: t.kind,
      label: t.label,
      settings: t.getSettings?.(),
      capabilities: t.getCapabilities?.(),
    }));
    tracks.forEach((t: any) => t.stop());
    const devices = await n().mediaDevices.enumerateDevices();
    return { settings, devices };
  }, 20000);

  const rows: Row[] = [];
  if (res && typeof res === "object") {
    for (const s of res.settings) {
      rows.push({ k: `${s.kind} track label`, v: s.label });
      rows.push({ k: `${s.kind} settings`, v: s.settings });
      rows.push({ k: `${s.kind} capabilities`, v: s.capabilities });
    }
    res.devices.forEach((d: any, i: number) =>
      rows.push({ k: `device[${i}] ${d.kind}`, v: d.label, n: `id ${String(d.deviceId).slice(0, 16)}…` })
    );
  } else {
    rows.push({ k: "getUserMedia()", v: String(res ?? "denied") });
  }
  return {
    id: "device-labels",
    title: "Media Device Details (granted)",
    note: "With camera/mic permission the browser reveals hardware names, stable device IDs and full track capabilities.",
    rows,
  };
}
