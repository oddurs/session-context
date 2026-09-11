import type { Section } from "./types";

/**
 * The requests a real analytics or advertising tag would send about this
 * visitor, constructed from the data already collected on this page.
 *
 * These are built and displayed. They are never sent: no request leaves this
 * machine, and no third party is contacted.
 */
export type TrackerPayload = {
  id: string;
  vendor: string;
  note: string;
  endpoint: string;
  body: string;
};

function pick(sections: Section[]) {
  const m = new Map<string, Map<string, unknown>>();
  for (const s of sections) {
    const r = new Map<string, unknown>();
    for (const row of s.rows) r.set(row.k, row.v);
    m.set(s.id, r);
  }
  return (sec: string, key: string) => m.get(sec)?.get(key);
}

export function buildTrackerPayloads(sections: Section[]): TrackerPayload[] {
  const g = pick(sections);
  const s = (v: unknown, fallback = "") => (v == null ? fallback : String(v));

  const clientId = s(g("persistence", "assigned identifier"), "0000000000.0000000000");
  const fpId = s(g("visitor-id", "visitorId"));
  const screenRes = `${s(g("screen", "screen.width"))}x${s(g("screen", "screen.height"))}`;
  const viewport = `${s(g("screen", "window.innerWidth"))}x${s(g("screen", "window.innerHeight"))}`;
  const lang = s(g("navigator", "language"), "en-US");
  const tz = s(g("locale", "Intl timeZone"));
  const ua = s(g("navigator", "userAgent"));
  const gpu = s(g("graphics", "WebGL 1 · UNMASKED_RENDERER"));
  const osName = s(g("ua-parsed", "os.name"));
  const osVer = s(g("client-hints", "sec-ch-ua-platform-version")).replace(/"/g, "");
  const browser = s(g("ua-parsed", "browser.name"));
  const browserVer = s(g("client-hints", "sec-ch-ua-full-version")).replace(/"/g, "");
  const dpr = s(g("screen", "devicePixelRatio"), "1");
  const colorDepth = s(g("screen", "screen.colorDepth"), "24");
  const cores = s(g("navigator", "hardwareConcurrency"));
  const mem = s(g("navigator", "deviceMemory"));
  const ect = s(g("network", "connection.effectiveType"));
  const rtt = s(g("network", "connection.rtt"));
  const ref = s(g("document", "document.referrer"), "");
  const href = s(g("document", "location.href"));
  const title = s(g("document", "document.title"));

  const ga4 = new URLSearchParams({
    v: "2",
    tid: "G-DEMO00000",
    gtm: "45je3bd0v9186012345za200",
    _p: String(Date.now()),
    cid: clientId,
    sid: String(Math.floor(Date.now() / 1000)),
    sct: "1",
    seg: "1",
    dl: href,
    dr: ref,
    dt: title,
    ul: lang.toLowerCase(),
    sr: screenRes,
    vp: viewport,
    sd: `${colorDepth}-bit`,
    _s: "1",
    _dbg: "0",
    en: "page_view",
    "ep.engagement_time_msec": "1",
    "up.device_class": cores ? `${cores}_cores` : "",
    _z: "ccd.v9B",
  });

  const meta = new URLSearchParams({
    id: "000000000000000",
    ev: "PageView",
    dl: href,
    rl: ref,
    if: "false",
    ts: String(Date.now()),
    sw: s(g("screen", "screen.width")),
    sh: s(g("screen", "screen.height")),
    v: "2.9.196",
    r: "stable",
    ec: "0",
    o: "30",
    fbp: `fb.1.${Date.now()}.${clientId}`,
    it: String(Date.now()),
    coo: "false",
    rqm: "GET",
  });

  const openRtb = {
    id: `bid-${Math.random().toString(36).slice(2, 12)}`,
    imp: [
      {
        id: "1",
        banner: { w: 300, h: 250, pos: 1 },
        bidfloor: 0.35,
        bidfloorcur: "USD",
        secure: 1,
      },
    ],
    site: {
      domain: s(g("document", "location.hostname")),
      page: href,
      ref,
      cat: ["IAB19"],
    },
    device: {
      ua,
      ip: s(g("server-derived", "client IP (x-forwarded-for)")),
      language: lang,
      os: osName,
      osv: osVer,
      make: gpu.includes("Apple") ? "Apple" : "",
      model: s(g("ua-parsed", "device.model")),
      devicetype: 2,
      h: Number(s(g("screen", "screen.height"), "0")),
      w: Number(s(g("screen", "screen.width"), "0")),
      pxratio: Number(dpr),
      js: 1,
      connectiontype: ect === "4g" ? 6 : 0,
      geo: { type: 2, utcoffset: -Number(s(g("locale", "getTimezoneOffset()"), "0").split(" ")[0]) },
      ext: {
        rtt,
        cores,
        memory_gb: mem,
        gpu,
        browser: `${browser} ${browserVer}`,
        timezone: tz,
        fingerprint: fpId,
      },
    },
    user: {
      id: clientId,
      buyeruid: fpId,
      ext: { consent: "", eids: [{ source: "fingerprint.local", uids: [{ id: fpId, atype: 3 }] }] },
    },
    regs: { ext: { gdpr: 0, us_privacy: "1---" } },
    at: 1,
    tmax: 120,
  };

  return [
    {
      id: "ga4",
      vendor: "Google Analytics 4",
      note: "The request the gtag.js snippet fires on page view. Your screen size, language, referring page and a persistent client id travel as query parameters; your IP address and user agent are read from the request itself.",
      endpoint: "POST https://www.google-analytics.com/g/collect",
      body: ga4.toString().split("&").join("\n&"),
    },
    {
      id: "meta",
      vendor: "Meta (Facebook) Pixel",
      note: "The PageView beacon. The `fbp` parameter is the browser identifier Meta stores in a first-party cookie on the site running the pixel, which is how it follows one person between unrelated sites.",
      endpoint: "GET https://www.facebook.com/tr/",
      body: meta.toString().split("&").join("\n&"),
    },
    {
      id: "openrtb",
      vendor: "Real-time bidding (OpenRTB 2.6 bid request)",
      note: "What an ad exchange broadcasts to hundreds of bidders, in milliseconds, every time an ad slot loads. Every bidder receives this whether or not it wins — which is how one page view becomes a data sale.",
      endpoint: "POST https://exchange.example/openrtb2/auction",
      body: JSON.stringify(openRtb, null, 2),
    },
  ];
}
