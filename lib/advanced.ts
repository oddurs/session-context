/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GatedResult, Row, Section } from "./types";
import { classifyDomError, list, probe, probeAsync } from "./probe";

const w = () => window as any;
const n = () => navigator as any;

/* ── worker cross-check ──────────────────────────────────────── */

const WORKER_SRC = `
self.onmessage = async () => {
  const r = {};
  const nv = self.navigator;
  for (const k of ['userAgent','platform','language','hardwareConcurrency','deviceMemory','onLine','vendor','product','appVersion'])
    { try { r[k] = nv[k]; } catch (e) { r[k] = 'error'; } }
  try { r.languages = (nv.languages || []).join(', '); } catch (e) {}
  try { r.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
  try { r.locale = Intl.DateTimeFormat().resolvedOptions().locale; } catch (e) {}
  try { r.uaDataPlatform = nv.userAgentData ? nv.userAgentData.platform : undefined; } catch (e) {}
  try { r.uaDataMobile = nv.userAgentData ? nv.userAgentData.mobile : undefined; } catch (e) {}
  try { r.offscreenCanvas = typeof OffscreenCanvas !== 'undefined'; } catch (e) {}
  try {
    const c = new OffscreenCanvas(64, 24);
    const x = c.getContext('2d');
    x.font = '12px sans-serif';
    x.fillText('worker \\u00e9\\u4e2d', 2, 12);
    const blob = await c.convertToBlob();
    r.offscreenBytes = blob.size;
  } catch (e) { r.offscreenBytes = 'unavailable'; }
  try {
    const gl = new OffscreenCanvas(32,32).getContext('webgl');
    const d = gl.getExtension('WEBGL_debug_renderer_info');
    r.webglRenderer = d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  } catch (e) { r.webglRenderer = 'unavailable'; }
  self.postMessage(r);
};`;

async function workerValues(): Promise<any> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
      const wk = new Worker(url);
      const t = setTimeout(() => {
        wk.terminate();
        URL.revokeObjectURL(url);
        resolve({ __error: "timed out" });
      }, 5000);
      wk.onmessage = (e) => {
        clearTimeout(t);
        wk.terminate();
        URL.revokeObjectURL(url);
        resolve(e.data);
      };
      wk.onerror = (e) => {
        clearTimeout(t);
        resolve({ __error: e.message ?? "worker error" });
      };
      wk.postMessage("go");
    } catch (e) {
      resolve({ __error: (e as Error).message });
    }
  });
}

export async function workerSection(): Promise<Section> {
  const wv = await workerValues();
  const rows: Row[] = [];
  if (wv.__error) {
    rows.push({ k: "Web Worker", v: `error: ${wv.__error}` });
  } else {
    const main: Record<string, unknown> = {
      userAgent: navigator.userAgent,
      platform: (navigator as any).platform,
      language: navigator.language,
      languages: navigator.languages?.join(", "),
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: n().deviceMemory,
      onLine: navigator.onLine,
      vendor: n().vendor,
      product: n().product,
      appVersion: n().appVersion,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      uaDataPlatform: n().userAgentData?.platform,
      uaDataMobile: n().userAgentData?.mobile,
    };
    for (const [k, v] of Object.entries(main)) {
      const wvv = wv[k];
      if (wvv === undefined || wvv === null) {
        rows.push({ k, v: String(v), n: "not exposed to workers" });
        continue;
      }
      const same = String(wvv) === String(v);
      rows.push({
        k,
        v: same ? String(v) : `main: ${v}\nworker: ${wvv}`,
        n: same ? "match" : "MISMATCH — spoofing on main thread",
      });
    }
    rows.push(
      { k: "worker OffscreenCanvas", v: wv.offscreenCanvas },
      { k: "worker canvas byte size", v: wv.offscreenBytes, n: "renders outside DOM" },
      { k: "worker WebGL renderer", v: wv.webglRenderer }
    );
  }
  return {
    id: "worker",
    title: "Web Worker Cross-Check",
    note: "The same values re-read inside a Web Worker, which many spoofing extensions forget to patch. Any MISMATCH row is itself a strong, unusual signal — the attempt to hide makes the browser more identifiable.",
    rows,
  };
}

/* ── tamper / automation detection ───────────────────────────── */

export function tamperSection(): Section {
  const natives: [string, unknown][] = [
    ["Function.prototype.bind", Function.prototype.bind],
    ["navigator.permissions.query", n().permissions?.query],
    ["HTMLCanvasElement.toDataURL", HTMLCanvasElement.prototype.toDataURL],
    ["CanvasRenderingContext2D.getImageData", (w().CanvasRenderingContext2D?.prototype ?? {}).getImageData],
    ["WebGLRenderingContext.getParameter", (w().WebGLRenderingContext?.prototype ?? {}).getParameter],
    ["AudioBuffer.getChannelData", (w().AudioBuffer?.prototype ?? {}).getChannelData],
    ["Date.prototype.getTimezoneOffset", Date.prototype.getTimezoneOffset],
    ["navigator.mediaDevices.enumerateDevices", n().mediaDevices?.enumerateDevices],
  ];
  const rows: Row[] = natives.map(([name, fn]) => {
    if (typeof fn !== "function") return { k: name, v: undefined };
    const src = Function.prototype.toString.call(fn);
    const native = src.includes("[native code]");
    return { k: name, v: native ? "native" : src.slice(0, 120), n: native ? undefined : "PATCHED" };
  });

  const uaGetter = Object.getOwnPropertyDescriptor(Navigator.prototype, "userAgent");
  const automationGlobals = [
    "webdriver", "_phantom", "__nightmare", "callPhantom", "__selenium_unwrapped",
    "__webdriver_evaluate", "__driver_evaluate", "_Selenium_IDE_Recorder",
    "domAutomation", "domAutomationController", "__puppeteer_evaluation_script__",
    "__playwright__binding__", "__pw_manual",
  ].filter((k) => k in window || k in navigator);
  const cdc = Object.getOwnPropertyNames(document).filter((k) => /^\$?cdc_|^\$chrome_asyncScriptInfo/.test(k));

  rows.push(
    { k: "navigator.userAgent descriptor", v: uaGetter ? "on Navigator.prototype (normal)" : "own property (overridden)" },
    { k: "navigator.webdriver", v: n().webdriver },
    { k: "automation globals found", v: automationGlobals.join(", ") || "none" },
    { k: "chromedriver artefacts", v: cdc.join(", ") || "none" },
    { k: "UA vs platform consistency", v: uaConsistency() },
    { k: "languages list empty", v: (navigator.languages?.length ?? 0) === 0, n: "classic headless tell" },
    { k: "plugins empty on Chromium", v: /Chrome/.test(navigator.userAgent) && n().plugins?.length === 0 },
    { k: "notification permission anomaly", v: notificationAnomaly() },
    { k: "prototype chain depth (navigator)", v: protoDepth(navigator) },
    { k: "toString tag of window", v: Object.prototype.toString.call(window) },
    { k: "iframe contentWindow reachable", v: iframeCheck() }
  );

  return {
    id: "tamper",
    title: "Tamper, Spoofing & Automation Detection",
    note: "Integrity checks on the JavaScript environment itself. Anti-detect tooling and privacy extensions patch native functions; the patches are visible, and leave fingerprints that no ordinary browser has.",
    rows,
  };
}

function uaConsistency(): string {
  const ua = navigator.userAgent;
  const plat = String(n().platform ?? "");
  const uadPlat = n().userAgentData?.platform;
  const claims = [
    { re: /Windows/i, plat: /Win/i, name: "Windows" },
    { re: /Macintosh|Mac OS X/i, plat: /Mac/i, name: "macOS" },
    { re: /Linux|X11/i, plat: /Linux/i, name: "Linux" },
    { re: /Android/i, plat: /Linux|Android/i, name: "Android" },
    { re: /iPhone|iPad/i, plat: /iPhone|iPad|Mac/i, name: "iOS" },
  ];
  const hit = claims.find((c) => c.re.test(ua));
  if (!hit) return `UA matches no known platform family (platform='${plat}')`;
  const ok = hit.plat.test(plat);
  return `UA claims ${hit.name}; navigator.platform='${plat}'${uadPlat ? `; UA-CH='${uadPlat}'` : ""} — ${ok ? "consistent" : "INCONSISTENT"}`;
}

function notificationAnomaly(): string {
  const p = w().Notification?.permission;
  if (p === undefined) return "Notification API absent";
  const perms = n().permissions;
  return p === "denied" && !perms ? "denied with no Permissions API (headless tell)" : `permission='${p}'`;
}

function protoDepth(o: unknown): number {
  let d = 0;
  let cur = Object.getPrototypeOf(o);
  while (cur) { d++; cur = Object.getPrototypeOf(cur); }
  return d;
}

function iframeCheck(): string {
  try {
    const f = document.createElement("iframe");
    f.style.display = "none";
    document.body.appendChild(f);
    const ok = !!f.contentWindow?.navigator?.userAgent;
    const same = f.contentWindow?.navigator?.userAgent === navigator.userAgent;
    f.remove();
    return ok ? (same ? "yes — UA matches parent" : "yes — UA DIFFERS from parent") : "no";
  } catch (e) {
    return `error: ${(e as Error).message}`;
  }
}

/* ── tracking persistence demo ───────────────────────────────── */

const ID_KEY = "dm_visitor";

function randomId(): string {
  return (crypto.randomUUID?.() ?? String(Math.random()).slice(2)).slice(0, 18);
}

function idbGet(): Promise<string | undefined> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("dm_store", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("kv");
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("kv", "readonly");
        const get = tx.objectStore("kv").get(ID_KEY);
        get.onsuccess = () => resolve(get.result);
        get.onerror = () => resolve(undefined);
      };
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

function idbSet(v: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("dm_store", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("kv");
      req.onsuccess = () => {
        const tx = req.result.transaction("kv", "readwrite");
        tx.objectStore("kv").put(v, ID_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** Cache Storage: a key/value store that survives a cookie clear. */
async function cacheGet(): Promise<string | undefined> {
  try {
    const c = await caches.open("dm-store");
    const hit = await c.match("/__id");
    return hit ? await hit.text() : undefined;
  } catch {
    return undefined;
  }
}

async function cacheSet(v: string) {
  try {
    const c = await caches.open("dm-store");
    await c.put("/__id", new Response(v));
  } catch {
    /* storage denied */
  }
}

/** Service worker cache: another compartment, cleared by different controls. */
async function swExchange(id?: string): Promise<string | null | "unsupported"> {
  if (!("serviceWorker" in navigator)) return "unsupported";
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    // `ready` never rejects: in a browser that will not activate a worker —
    // Firefox in a private window, a hardened profile, anything with service
    // workers switched off — it simply never resolves. Waiting on it without
    // a bound stalled the whole page.
    const active = await Promise.race([
      navigator.serviceWorker.ready.then(() => true),
      new Promise<false>((resolve) => setTimeout(() => resolve(false), 2000)),
    ]);
    if (!active) return "unsupported";
    const worker = reg.active ?? navigator.serviceWorker.controller;
    if (!worker) return null;
    const ask = (msg: any) =>
      new Promise<any>((resolve) => {
        const onMsg = (e: MessageEvent) => {
          navigator.serviceWorker.removeEventListener("message", onMsg);
          resolve(e.data);
        };
        navigator.serviceWorker.addEventListener("message", onMsg);
        worker.postMessage(msg);
        setTimeout(() => resolve(null), 2000);
      });
    const read = await ask({ type: "read" });
    if (id) await ask({ type: "store", id });
    return read?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * The HTTP cache as a store. The server tags a response with an ETag; the
 * browser hands it back on every revalidation. Clearing cookies and site data
 * does not touch it — only clearing the cache does.
 */
async function etagExchange(): Promise<{ id?: string; hits?: number; firstSeen?: string; error?: string }> {
  try {
    const res = await fetch("/api/etag", { cache: "default" });
    const { id } = await res.json();
    const info = await fetch(`/api/etag-info?id=${encodeURIComponent(id)}`, { cache: "no-store" }).then((r) => r.json());
    return { id, hits: info.hits, firstSeen: info.firstSeen };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function persistenceSection(): Promise<Section> {
  const readCookie = () =>
    document.cookie.split("; ").find((c) => c.startsWith(`${ID_KEY}=`))?.split("=")[1];

  const before = {
    cookie: readCookie(),
    local: safe(() => localStorage.getItem(ID_KEY)),
    session: safe(() => sessionStorage.getItem(ID_KEY)),
    idb: await idbGet(),
    cache: await cacheGet(),
    windowName: safe(() => (window.name.startsWith(`${ID_KEY}:`) ? window.name.slice(ID_KEY.length + 1) : undefined)),
    sw: undefined as string | null | undefined | "unsupported",
  };
  before.sw = (await swExchange()) ?? undefined;
  const etag = await etagExchange();

  // Respawn: any surviving copy repopulates all the others.
  const survivor =
    before.cookie ??
    before.local ??
    before.idb ??
    before.cache ??
    (typeof before.sw === "string" && before.sw !== "unsupported" ? before.sw : undefined) ??
    before.windowName ??
    before.session;
  const id = survivor ?? randomId();
  const isNew = !survivor;

  const visitsRaw = safe(() => localStorage.getItem(`${ID_KEY}_visits`));
  const visits = Number(visitsRaw ?? 0) + 1;
  const firstSeen = safe(() => localStorage.getItem(`${ID_KEY}_first`)) ?? new Date().toISOString();

  safe(() => {
    document.cookie = `${ID_KEY}=${id}; path=/; max-age=31536000; SameSite=Lax`;
    localStorage.setItem(ID_KEY, id);
    localStorage.setItem(`${ID_KEY}_visits`, String(visits));
    localStorage.setItem(`${ID_KEY}_first`, firstSeen);
    sessionStorage.setItem(ID_KEY, id);
  });
  await idbSet(id);
  await cacheSet(id);
  await swExchange(id);
  safe(() => { window.name = `${ID_KEY}:${id}`; });

  const labels: Record<string, string> = {
    cookie: "cookie",
    local: "localStorage",
    session: "sessionStorage",
    idb: "IndexedDB",
    cache: "Cache Storage",
    sw: "service worker cache",
    windowName: "window.name",
  };
  const survived = Object.entries(before)
    .filter(([, v]) => v && v !== "unsupported")
    .map(([k]) => labels[k] ?? k);

  return {
    id: "persistence",
    title: "Tracking Persistence (live demonstration)",
    note: "This page writes one identifier into seven independent places at once — cookies, localStorage, sessionStorage, IndexedDB, Cache Storage, a service worker and window.name — and separately receives an eighth from the server hidden in the HTTP cache as an ETag. On each visit it restores the identifier from whichever copy survived. Clearing cookies does not erase you; the value respawns. Nothing is sent anywhere — the demonstration is entirely local.",
    rows: [
      { k: "assigned identifier", v: id },
      { k: "status", v: isNew ? "newly assigned this visit" : "recovered from prior visit" },
      { k: "recovered from", v: survived.join(", ") || "nothing — first visit or fully cleared" },
      { k: "storage mechanisms written", v: 7, n: "each one has to be cleared separately" },
      { k: "cookie copy (before)", v: before.cookie ?? "absent" },
      { k: "localStorage copy (before)", v: before.local ?? "absent" },
      { k: "sessionStorage copy (before)", v: before.session ?? "absent", n: "cleared when tab closes" },
      { k: "indexedDB copy (before)", v: before.idb ?? "absent" },
      { k: "Cache Storage copy (before)", v: before.cache ?? "absent" },
      { k: "service worker copy (before)", v: before.sw ?? "absent", n: "survives a cookie clear" },
      { k: "window.name copy (before)", v: before.windowName ?? "absent", n: "follows the tab, not the site" },
      { k: "HTTP cache (ETag) identifier", v: etag.id ?? etag.error, n: "not site data — lives in the cache" },
      { k: "server has revalidated this ETag", v: etag.hits != null ? `${etag.hits} time(s)` : undefined, n: "each one proves it is you" },
      { k: "ETag first issued", v: etag.firstSeen },
      {
        k: "ETag retention",
        v: "24 hours, or 5,000 visitors",
        n: "after that the server forgets and mints a new one — a limit of this demonstration, not of the technique",
      },
      { k: "visit count", v: visits },
      { k: "first seen", v: firstSeen },
      { k: "all copies now rewritten", v: true, n: "respawn complete" },
    ],
  };
}

function safe<T>(fn: () => T): T | undefined {
  try { return fn(); } catch { return undefined; }
}

/* ── system theme & UI metrics ───────────────────────────────── */

const SYSTEM_COLORS = [
  "AccentColor", "AccentColorText", "ActiveText", "ButtonBorder", "ButtonFace",
  "ButtonText", "Canvas", "CanvasText", "Field", "FieldText", "GrayText",
  "Highlight", "HighlightText", "LinkText", "Mark", "MarkText", "SelectedItem",
  "SelectedItemText", "VisitedText",
];

export async function systemUISection(): Promise<Section> {
  const el = document.createElement("div");
  el.style.cssText = "position:absolute;left:-9999px";
  document.body.appendChild(el);
  const colors: Row[] = SYSTEM_COLORS.map((c) => {
    el.style.color = "";
    el.style.color = c;
    const v = getComputedStyle(el).color;
    return { k: `system color · ${c}`, v: v || "not resolved" };
  });
  el.remove();

  const scroller = document.createElement("div");
  scroller.style.cssText = "position:absolute;left:-9999px;width:100px;height:100px;overflow:scroll";
  document.body.appendChild(scroller);
  const scrollbar = scroller.offsetWidth - scroller.clientWidth;
  scroller.remove();

  const hz = await refreshRate();

  return {
    id: "system-ui",
    title: "System Theme & UI Metrics",
    note: "Resolved CSS system colors expose the OS theme — including the user's chosen accent color. Scrollbar width and refresh rate distinguish platforms and displays.",
    rows: [
      ...colors,
      { k: "scrollbar width", v: `${scrollbar} px`, n: "0 = overlay scrollbars (macOS/mobile)" },
      { k: "display refresh rate", v: hz },
      { k: "default font size", v: getComputedStyle(document.documentElement).fontSize },
      { k: "default font family", v: getComputedStyle(document.body).fontFamily },
      { k: "text size adjust", v: getComputedStyle(document.body).webkitTextSizeAdjust ?? "n/a" },
      { k: "caret color", v: getComputedStyle(document.body).caretColor },
      { k: "emoji/text metric hash", v: textMetricHash(), n: "reveals OS font & emoji version" },
    ],
  };
}

function refreshRate(): Promise<string> {
  return new Promise((resolve) => {
    const times: number[] = [];
    let frames = 0;
    const tick = (t: number) => {
      times.push(t);
      if (++frames < 40) requestAnimationFrame(tick);
      else {
        const deltas = times.slice(1).map((v, i) => v - times[i]).sort((a, b) => a - b);
        const median = deltas[Math.floor(deltas.length / 2)];
        resolve(median ? `${(1000 / median).toFixed(1)} Hz (median frame ${median.toFixed(2)} ms)` : "unmeasurable");
      }
    };
    requestAnimationFrame(tick);
    setTimeout(() => resolve("timed out"), 3000);
  });
}

function textMetricHash(): string {
  const c = document.createElement("canvas");
  const x = c.getContext("2d")!;
  const samples = ["\u{1F600}", "\u{1F1FA}\u{1F1F8}", "\u{1F469}‍\u{1F4BB}", "中文", "العربية", "हिन्दी", "mmmWWWiii", "\u{1F3F3}️‍\u{1F308}"];
  const fonts = ["12px sans-serif", "12px serif", "12px monospace", "48px sans-serif"];
  let s = "";
  for (const f of fonts) {
    x.font = f;
    for (const t of samples) {
      const m = x.measureText(t);
      s += `${m.width.toFixed(4)}|${(m.actualBoundingBoxAscent ?? 0).toFixed(3)}|${(m.actualBoundingBoxDescent ?? 0).toFixed(3)};`;
    }
  }
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return `${(h >>> 0).toString(16)} (${s.length} metric bytes)`;
}

/* ── performance class ───────────────────────────────────────── */

/** Hand the main thread back so a benchmark never becomes one long task. */
const yieldToBrowser = () =>
  new Promise<void>((resolve) => {
    const scheduler = (globalThis as any).scheduler;
    if (scheduler?.yield) scheduler.yield().then(resolve);
    else setTimeout(resolve, 0);
  });

export async function benchmarkSection(): Promise<Section> {
  const t0 = performance.now();
  let acc = 0;
  for (let i = 1; i <= 3_000_000; i++) acc += Math.sqrt(i) * Math.sin(i) + Math.log(i);
  const mathMs = performance.now() - t0;
  // Publish the accumulator so the loop cannot be optimized away as dead code.
  (globalThis as any).__dmBenchAcc = acc;

  await yieldToBrowser();

  const t1 = performance.now();
  const arr = new Float64Array(1_000_000);
  for (let i = 0; i < arr.length; i++) arr[i] = (arr.length - i) * 1.000001;
  arr.sort();
  const memMs = performance.now() - t1;
  (globalThis as any).__dmBenchSum = arr[0] + arr[arr.length - 1];

  await yieldToBrowser();

  const t2 = performance.now();
  const data = new Uint8Array(1_000_000);
  crypto.getRandomValues(data.subarray(0, 65536));
  await crypto.subtle.digest("SHA-256", data);
  const cryptoMs = performance.now() - t2;

  return {
    id: "benchmark",
    title: "Performance Class",
    note: "Micro-benchmarks run in this tab. Timings cluster tightly by CPU model and thermal state, so they classify the device even when every API-reported value is spoofed.",
    rows: [
      { k: "float math (9M ops)", v: `${mathMs.toFixed(1)} ms`, n: `${(9000 / mathMs).toFixed(1)}M ops/s` },
      { k: "typed array fill + sort (1M)", v: `${memMs.toFixed(1)} ms` },
      { k: "SHA-256 of 1 MB", v: `${cryptoMs.toFixed(1)} ms` },
      { k: "composite score", v: (10000 / (mathMs + memMs + cryptoMs)).toFixed(2), n: "higher is faster" },
      { k: "logical cores", v: navigator.hardwareConcurrency },
      { k: "device memory", v: n().deviceMemory ? `${n().deviceMemory} GiB` : undefined, n: "browser-reported" },
      {
        k: "JS heap limit",
        v: (performance as any).memory?.jsHeapSizeLimit
          ? `${((performance as any).memory.jsHeapSizeLimit / 1048576).toFixed(0)} MiB`
          : undefined,
      },
    ],
  };
}

/* ── media capabilities ──────────────────────────────────────── */

export async function mediaCapabilitiesSection(): Promise<Section> {
  const mc = n().mediaCapabilities;
  const rows: Row[] = [];
  const configs: [string, any][] = [
    ["H.264 1080p30", { type: "file", video: { contentType: 'video/mp4; codecs="avc1.42E01E"', width: 1920, height: 1080, bitrate: 4_000_000, framerate: 30 } }],
    ["H.265 4K60", { type: "file", video: { contentType: 'video/mp4; codecs="hvc1.1.6.L93.B0"', width: 3840, height: 2160, bitrate: 20_000_000, framerate: 60 } }],
    ["VP9 4K60", { type: "file", video: { contentType: 'video/webm; codecs="vp09.00.10.08"', width: 3840, height: 2160, bitrate: 20_000_000, framerate: 60 } }],
    ["AV1 4K60", { type: "file", video: { contentType: 'video/mp4; codecs="av01.0.05M.08"', width: 3840, height: 2160, bitrate: 20_000_000, framerate: 60 } }],
    ["Opus stereo", { type: "file", audio: { contentType: 'audio/webm; codecs="opus"', channels: "2", bitrate: 128_000, samplerate: 48000 } }],
  ];
  if (!mc) {
    rows.push({ k: "navigator.mediaCapabilities", v: undefined });
  } else {
    for (const [label, cfg] of configs) {
      try {
        const r = await mc.decodingInfo(cfg);
        rows.push({
          k: label,
          v: `supported: ${r.supported}, smooth: ${r.smooth}, powerEfficient: ${r.powerEfficient}`,
          n: r.powerEfficient ? "hardware decode" : "software decode",
        });
      } catch (e) {
        rows.push({ k: label, v: `error: ${(e as Error).message}` });
      }
    }
  }
  rows.push({
    k: "getInstalledRelatedApps()",
    v: await (async () => {
      try {
        const apps = await n().getInstalledRelatedApps?.();
        return apps ? (apps.length ? JSON.stringify(apps) : "none installed") : undefined;
      } catch (e) {
        return `error: ${(e as Error).message}`;
      }
    })(),
    n: "detects installed native/PWA apps",
  });
  return {
    id: "media-capabilities",
    title: "Decode Capabilities",
    note: "Whether each codec decodes smoothly and in hardware. The pattern of hardware support is essentially a chipset signature.",
    rows,
  };
}

/* ── gated: screen details, clipboard, idle, sensors ─────────── */

export async function probeScreenDetails(): Promise<GatedResult> {
  const wrap = (rows: Row[]): Section => ({
    id: "screen-details",
    title: "Multi-Screen Details (granted)",
    note: "The Window Management permission reveals every attached display: resolution, position in the virtual desktop, color depth and manufacturer label.",
    rows,
  });

  if (!w().getScreenDetails) {
    return {
      section: wrap([{ k: "getScreenDetails()", v: undefined }]),
      outcome: "unsupported",
      reason:
        "Window Management ships in Chromium only. Firefox and Safari have not implemented it.",
    };
  }

  try {
    const det = await w().getScreenDetails();
    const rows: Row[] = [
      { k: "screens attached", v: det.screens.length },
      { k: "current screen label", v: det.currentScreen?.label },
    ];
    det.screens.forEach((s: any, i: number) => {
      rows.push({
        k: `screen[${i}] ${s.label || "(unlabeled)"}`,
        v: `${s.width}×${s.height} @ (${s.left},${s.top}) · avail ${s.availWidth}×${s.availHeight} · ${s.colorDepth}-bit · ${s.devicePixelRatio}x${s.isPrimary ? " · primary" : ""}${s.isInternal ? " · internal" : ""}`,
      });
    });
    return { section: wrap(rows), outcome: "granted" };
  } catch (e) {
    return classifyDomError(e, wrap([{ k: "getScreenDetails()", v: `error: ${(e as Error).message}` }]));
  }
}

export async function probeClipboard(): Promise<GatedResult> {
  const wrap = (rows: Row[]): Section => ({
    id: "clipboard",
    title: "Clipboard Contents (granted)",
    note: "With clipboard-read permission a page can silently read whatever you last copied — frequently a password, address or message.",
    rows,
  });

  if (!n().clipboard?.readText) {
    return {
      section: wrap([{ k: "clipboard.readText()", v: undefined }]),
      outcome: "unsupported",
      reason: "This browser does not expose asynchronous clipboard reading to pages.",
    };
  }

  let text: string;
  try {
    text = await n().clipboard.readText();
  } catch (e) {
    return classifyDomError(e, wrap([{ k: "clipboard.readText()", v: `error: ${(e as Error).message}` }]));
  }

  const rows: Row[] = [
    { k: "clipboard length", v: text.length },
    { k: "clipboard contents", v: text.slice(0, 2000) || "(empty)" },
  ];
  try {
    const items = await n().clipboard.read();
    rows.push({ k: "clipboard item types", v: items.flatMap((i: any) => i.types).join(", ") });
  } catch {
    /* text-only browsers */
  }
  return { section: wrap(rows), outcome: "granted" };
}

export async function probeIdle(): Promise<GatedResult> {
  const wrap = (rows: Row[]): Section => ({
    id: "idle",
    title: "Idle & Lock State (granted)",
    note: "Idle Detection reports whether you are at the keyboard and whether the screen is locked — continuously, in the background.",
    rows,
  });

  const ID = w().IdleDetector;
  if (!ID) {
    return {
      section: wrap([{ k: "IdleDetector", v: undefined }]),
      outcome: "unsupported",
      reason:
        "Idle Detection ships in Chromium only. Mozilla and Apple both filed formal objections to it, calling it surveillance-shaped.",
    };
  }

  try {
    const state = await ID.requestPermission();
    if (state !== "granted") {
      return { section: wrap([{ k: "permission", v: state }]), outcome: "denied" };
    }
    const d = new ID();
    await d.start({ threshold: 60000 });
    return {
      section: wrap([
        { k: "permission", v: state },
        { k: "user state", v: d.userState, n: "active / idle" },
        { k: "screen state", v: d.screenState, n: "locked / unlocked" },
      ]),
      outcome: "granted",
    };
  } catch (e) {
    return classifyDomError(e, wrap([{ k: "IdleDetector", v: `error: ${(e as Error).message}` }]));
  }
}

/** Wait for one event of a kind, or give up. */
function firstEvent(type: string, ms: number): Promise<any | undefined> {
  return new Promise((resolve) => {
    const done = (e?: any) => {
      removeEventListener(type, handler);
      clearTimeout(timer);
      resolve(e);
    };
    const handler = (e: any) => done(e);
    addEventListener(type, handler);
    const timer = setTimeout(() => done(undefined), ms);
  });
}

export async function probeSensors(): Promise<GatedResult> {
  const wrap = (rows: Row[]): Section => ({
    id: "sensors",
    title: "Motion & Orientation Sensors (granted)",
    note: "Accelerometer and gyroscope readings. Sensor calibration noise is unique per physical device and survives every browser reset.",
    rows,
  });

  const DOE = w().DeviceOrientationEvent;
  if (!DOE) {
    return {
      section: wrap([{ k: "DeviceOrientationEvent", v: undefined }]),
      outcome: "unsupported",
      reason: "This browser exposes no motion or orientation events.",
    };
  }

  const rows: Row[] = [];
  if (DOE.requestPermission) {
    // iOS is the only platform that asks. Everywhere else the events simply
    // flow, or the hardware is not there.
    let state: string;
    try {
      state = await DOE.requestPermission();
    } catch (e) {
      return classifyDomError(e, wrap([{ k: "DeviceOrientation permission", v: `error: ${(e as Error).message}` }]));
    }
    rows.push({ k: "DeviceOrientation permission", v: state });
    if (state !== "granted") return { section: wrap(rows), outcome: "denied" };
  } else {
    rows.push({ k: "DeviceOrientation permission", v: "not required on this platform" });
  }

  const orientation = await firstEvent("deviceorientation", 3000);
  const motion = await firstEvent("devicemotion", 3000);

  // A desktop does not stay silent: Chrome fires `devicemotion` on a timer
  // with every reading null, because the event exists and the hardware does
  // not. An event with nothing in it is the same fact as no event at all, and
  // reporting it as a working sensor would be the exact failure this section
  // is supposed to argue against.
  const n3 = (v: any) => (typeof v === "number" ? v.toFixed(3) : undefined);
  const n2 = (v: any) => (typeof v === "number" ? v.toFixed(2) : undefined);
  const orientationRead = [orientation?.alpha, orientation?.beta, orientation?.gamma].some(
    (v) => typeof v === "number"
  );
  const motionRead = [
    motion?.acceleration?.x,
    motion?.acceleration?.y,
    motion?.acceleration?.z,
    motion?.accelerationIncludingGravity?.x,
    motion?.rotationRate?.alpha,
  ].some((v) => typeof v === "number");

  if (!orientationRead && !motionRead) {
    rows.push({ k: "orientation sample", v: undefined }, { k: "motion sample", v: undefined });
    return {
      section: wrap(rows),
      outcome: "unsupported",
      reason:
        "The events fired, but every reading in them was empty — which on a desktop or laptop means there is no accelerometer or gyroscope behind them. On a phone this returns real numbers immediately.",
    };
  }

  rows.push({
    k: "orientation sample",
    v: orientationRead
      ? `α ${n2(orientation.alpha)} β ${n2(orientation.beta)} γ ${n2(orientation.gamma)} absolute=${orientation.absolute}`
      : undefined,
  });
  rows.push({
    k: "motion sample",
    v: motionRead
      ? `accel ${n3(motion.acceleration?.x)}/${n3(motion.acceleration?.y)}/${n3(motion.acceleration?.z)} · gravity ${n3(motion.accelerationIncludingGravity?.x)} · rate ${n3(motion.rotationRate?.alpha)} · interval ${motion.interval}`
      : undefined,
  });
  return { section: wrap(rows), outcome: "granted" };
}

/* ── cross-tab awareness ─────────────────────────────────────── */

/**
 * Pages of the same site can talk to each other. Counting the replies tells
 * this tab how many others you have open — and lets state be shared between
 * them, including identifiers.
 */
export async function crossTabSection(): Promise<Section> {
  const rows: Row[] = [];
  const me = Math.random().toString(36).slice(2, 8);
  let peers = 0;

  if ("BroadcastChannel" in window) {
    try {
      const ch = new BroadcastChannel("dm_tabs");
      const seen = new Set<string>();
      ch.onmessage = (e) => {
        if (e.data?.type === "pong" && e.data.from !== me) seen.add(e.data.from);
        if (e.data?.type === "ping" && e.data.from !== me) ch.postMessage({ type: "pong", from: me });
      };
      ch.postMessage({ type: "ping", from: me });
      await new Promise((r) => setTimeout(r, 400));
      peers = seen.size;
      ch.close();
      rows.push(
        { k: "BroadcastChannel", v: "supported" },
        { k: "other tabs of this site open", v: peers, n: "they answered a broadcast" },
        { k: "this tab's temporary id", v: me }
      );
    } catch (e) {
      rows.push({ k: "BroadcastChannel", v: `error: ${(e as Error).message}` });
    }
  } else {
    rows.push({ k: "BroadcastChannel", v: undefined });
  }

  rows.push(
    { k: "SharedWorker", v: "SharedWorker" in window ? "supported" : undefined, n: "shares one thread across tabs" },
    { k: "Web Locks API", v: probe(() => (n().locks ? "supported" : undefined)), n: "can count tabs by lock holders" },
    {
      k: "locks currently held",
      v: await probeAsync(async () => {
        const st = await n().locks?.query?.();
        return st ? `${st.held?.length ?? 0} held, ${st.pending?.length ?? 0} pending` : undefined;
      }, 1500),
    },
    { k: "storage events", v: "fires in other tabs on write", n: "another cross-tab channel" }
  );

  return {
    id: "cross-tab",
    title: "Other Tabs & Windows",
    note: "Every tab you have open on the same site can see and talk to the others. That makes an identifier assigned in one tab instantly available in all of them, and reveals how you use your browser.",
    rows,
  };
}

/* ── thermal state & sustained performance ───────────────────── */

/**
 * Run the same benchmark repeatedly. A machine that is hot, on battery saver
 * or busy slows down in a characteristic way — which describes its cooling,
 * its power state and what else you are running.
 */
export async function thermalSection(): Promise<Section> {
  const runs: number[] = [];
  for (let r = 0; r < 5; r++) {
    await yieldToBrowser();
    const t = performance.now();
    let acc = 0;
    for (let i = 1; i <= 1_500_000; i++) acc += Math.sqrt(i) * Math.sin(i);
    (globalThis as any).__dmThermal = acc;
    runs.push(performance.now() - t);
    await new Promise((res) => setTimeout(res, 30));
  }
  const first = runs[0];
  const last = runs[runs.length - 1];
  const drift = ((last - first) / first) * 100;

  const rows: Row[] = runs.map((ms, i) => ({
    k: `benchmark run ${i + 1}`,
    v: `${ms.toFixed(1)} ms`,
  }));
  rows.push(
    { k: "drift across runs", v: `${drift > 0 ? "+" : ""}${drift.toFixed(1)}%`, n: drift > 15 ? "slowing — thermal or power limited" : "steady" },
    { k: "fastest run", v: `${Math.min(...runs).toFixed(1)} ms` },
    { k: "slowest run", v: `${Math.max(...runs).toFixed(1)} ms` }
  );

  const PO = w().PressureObserver;
  if (PO) {
    const sample = await probeAsync(
      () =>
        new Promise<string>((resolve) => {
          const obs = new PO((records: any[]) => {
            const r = records[records.length - 1];
            obs.disconnect();
            resolve(`${r.state} (source ${r.source})`);
          });
          obs.observe("cpu", { sampleInterval: 1000 }).catch(() => resolve("not permitted"));
          setTimeout(() => resolve("no sample within 3 s"), 3000);
        }),
      4000
    );
    rows.push(
      { k: "Compute Pressure API", v: "supported", n: "reports CPU load state" },
      { k: "current CPU pressure", v: sample, n: "nominal / fair / serious / critical" },
      { k: "known pressure sources", v: probe(() => list(PO.knownSources)) }
    );
  } else {
    rows.push({ k: "Compute Pressure API", v: undefined, n: "Chromium only" });
  }

  return {
    id: "thermal",
    title: "Sustained Performance & Thermal State",
    note: "Repeating the same work several times exposes how your machine behaves under load — whether it throttles, whether it is on battery saver, and how busy it already is.",
    rows,
  };
}

/* ── gated: installed desktop applications ───────────────────── */

export const SCHEMES: [string, string][] = [
  ["slack", "Slack"],
  ["zoommtg", "Zoom"],
  ["spotify", "Spotify"],
  ["discord", "Discord"],
  ["vscode", "Visual Studio Code"],
  ["figma", "Figma"],
  ["notion", "Notion"],
  ["msteams", "Microsoft Teams"],
  ["whatsapp", "WhatsApp"],
  ["tg", "Telegram"],
  ["obsidian", "Obsidian"],
  ["postman", "Postman"],
];

/**
 * "Scheme flooding": ask the browser to open an application's custom URL and
 * watch whether the page loses focus. A hit means the application is
 * installed — a list of desktop software, from a web page.
 *
 * This is the one intrusive probe on the page: a hit can genuinely launch the
 * application. It only ever runs behind an explicit confirmation.
 */
export async function probeSchemes(): Promise<GatedResult> {
  const rows: Row[] = [];
  for (const [scheme, name] of SCHEMES) {
    const detected = await new Promise<boolean>((resolve) => {
      const frame = document.createElement("iframe");
      frame.style.cssText = "position:absolute;width:0;height:0;border:0;left:-9999px";
      document.body.appendChild(frame);
      let blurred = false;
      const onBlur = () => { blurred = true; };
      addEventListener("blur", onBlur, { once: true });
      try {
        frame.contentWindow!.location.href = `${scheme}://probe`;
      } catch {
        /* navigation refused — counts as not installed */
      }
      setTimeout(() => {
        removeEventListener("blur", onBlur);
        frame.remove();
        window.focus();
        resolve(blurred);
      }, 350);
    });
    rows.push({
      k: name,
      v: detected ? "appears to be installed" : "no response",
      n: `${scheme}://`,
    });
  }
  rows.push({
    k: "method",
    v: "custom protocol handler probing (scheme flooding)",
    n: "heuristic — results vary by browser",
  });
  return {
    section: {
      id: "schemes",
      title: "Installed Desktop Applications (granted)",
      note: "Detected by asking the browser to open each application's own URL scheme and watching whether this window lost focus. Browsers have tightened this repeatedly because it reveals software you never told the web about.",
      rows,
    },
    // There is no permission here to grant or refuse — that is the point of
    // the technique, and why browsers keep narrowing it.
    outcome: "granted",
  };
}

/* ── the remedy ──────────────────────────────────────────────── */

export type ErasureResult = {
  store: string;
  /** the identifier this store held before the attempt */
  before?: string;
  /** what a fresh read found afterwards — undefined means it is gone */
  after?: string;
  cleared: boolean;
  note?: string;
};

/** The service worker keeps its copy in an ordinary cache, readable from here. */
async function swCacheGet(): Promise<string | undefined> {
  try {
    const hit = await (await caches.open("dm-sw-id")).match("/__id");
    return hit ? await hit.text() : undefined;
  } catch {
    return undefined;
  }
}

const cookieId = () =>
  document.cookie.split("; ").find((c) => c.startsWith(`${ID_KEY}=`))?.split("=")[1];

/**
 * Undo what this page stored.
 *
 * Every store is read before, cleared, and read again: "cleared" is a
 * measurement rather than a claim that a call did not throw. The page argues
 * all the way through that you should be shown the values behind a statement,
 * and this was the one statement it was asking you to take on trust.
 *
 * Watching how many separate places have to be emptied is the lesson, so each
 * result is reported as it lands rather than all of them at the end.
 */
export async function eraseEverything(
  onResult?: (result: ErasureResult) => void
): Promise<ErasureResult[]> {
  const results: ErasureResult[] = [];

  const step = async (
    store: string,
    read: () => Promise<string | undefined> | string | undefined,
    clear: () => void | Promise<void>,
    note?: string
  ) => {
    const before = (await read()) ?? undefined;
    let failure: string | undefined;
    try {
      await clear();
    } catch (e) {
      failure = (e as Error).message;
    }
    const after = (await read()) ?? undefined;
    const result: ErasureResult = {
      store,
      before,
      after,
      cleared: !after,
      note: failure ?? note,
    };
    results.push(result);
    onResult?.(result);
    return result;
  };

  await step("Cookies", cookieId, () => {
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0]?.trim();
      if (name) document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  });

  await step(
    "localStorage",
    () => safe(() => localStorage.getItem(ID_KEY)) ?? undefined,
    () => localStorage.clear()
  );

  await step(
    "sessionStorage",
    () => safe(() => sessionStorage.getItem(ID_KEY)) ?? undefined,
    () => sessionStorage.clear()
  );

  await step("IndexedDB", idbGet, async () => {
    const dbs = await (indexedDB as unknown as {
      databases?: () => Promise<{ name?: string }[]>;
    }).databases?.();
    // Firefox does not implement databases(); the one this page made is known
    // by name, so it can be removed without enumerating.
    for (const db of dbs ?? [{ name: "dm_store" }]) {
      if (db.name) {
        await new Promise<void>((resolve) => {
          const req = indexedDB.deleteDatabase(db.name!);
          req.onsuccess = req.onerror = req.onblocked = () => resolve();
        });
      }
    }
  });

  await step("Cache Storage", cacheGet, async () => {
    for (const key of await caches.keys()) await caches.delete(key);
  });

  // Unregistering leaves the worker's cache behind, and the cache is where the
  // identifier actually is. Both have to go, and they are cleared by different
  // controls in every browser's settings.
  await step("Service worker", swCacheGet, async () => {
    const registrations = await navigator.serviceWorker?.getRegistrations?.();
    for (const registration of registrations ?? []) await registration.unregister();
    await caches.delete("dm-sw-id");
  });

  await step(
    "window.name",
    () => (window.name.startsWith(`${ID_KEY}:`) ? window.name.slice(ID_KEY.length + 1) : undefined),
    () => {
      window.name = "";
    }
  );

  // The eighth copy is not site data at all. Asking the server for it again is
  // the proof: the same identifier comes back, because the browser still has
  // the response cached and hands its tag over on every revalidation.
  const etag = await step(
    "HTTP cache (ETag)",
    async () => {
      try {
        const res = await fetch("/api/etag", { cache: "default" });
        return (await res.json()).id as string | undefined;
      } catch {
        return undefined;
      }
    },
    () => {
      /* there is nothing to call: no page can clear the browser cache */
    },
    "No page can clear the HTTP cache. This one goes only when you clear the cache yourself, from your browser's own settings."
  );
  void etag;

  return results;
}

