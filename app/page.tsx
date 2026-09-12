import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import type { Row, Section } from "@/lib/types";
import { ClientProbe } from "@/components/ClientProbe";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

const HINT_PREFIXES = [
  "sec-ch-", "device-memory", "downlink", "ect", "rtt", "save-data",
  "dpr", "viewport-width", "width",
];

async function serverSections(): Promise<Section[]> {
  const h = await headers();
  const c = await cookies();
  const entries = [...h.entries()].sort(([a], [b]) => a.localeCompare(b));

  const real = entries.filter(([k]) => !k.startsWith("x-dm-"));
  const hints = real.filter(([k]) => HINT_PREFIXES.some((p) => k.startsWith(p)));
  const plain = real.filter(([k]) => !HINT_PREFIXES.some((p) => k.startsWith(p)));
  const dm = (k: string) => h.get(`x-dm-${k}`) ?? undefined;

  const headerRows: Row[] = plain.map(([k, v]) => ({ k, v }));
  const hintRows: Row[] =
    hints.length > 0
      ? hints.map(([k, v]) => ({ k, v }))
      : [{ k: "no client hints received", v: "reload once — the browser must see the server's Accept-CH before it sends them" }];

  const fwd = h.get("x-forwarded-for");
  const ua = h.get("user-agent") ?? "";
  // Behind a hosting proxy the socket belongs to the proxy, not the visitor,
  // and the headers have already been re-emitted. Saying otherwise would
  // overclaim exactly where this page is asking to be trusted.
  const proxied = Boolean(fwd || h.get("x-forwarded-proto"));
  const viaProxy = proxied ? "as seen from the hosting proxy, not the browser" : undefined;

  const connectionRows: Row[] = [
    {
      k: "HTTP version",
      v: dm("http-version"),
      n: proxied ? "proxy to server; your browser likely negotiated HTTP/2 or /3 at the edge" : undefined,
    },
    {
      k: "transport",
      v: dm("encrypted"),
      n: proxied ? "the proxy terminated TLS; your connection to it was encrypted" : undefined,
    },
    { k: "remote address", v: dm("remote-addr"), n: proxied ? "the proxy's address, not yours" : "peer socket address" },
    { k: "remote port", v: dm("remote-port"), n: proxied ? "the proxy's port" : "ephemeral, new per connection" },
    { k: "address family", v: dm("remote-family") },
    { k: "local (server) address", v: dm("local-addr") },
    { k: "requests on this TCP connection", v: dm("socket-requests"), n: "keep-alive reuse" },
    { k: "bytes read on socket", v: dm("socket-bytes-read") },
    { k: "header count", v: dm("header-count") },
    {
      k: "raw header order",
      v: dm("header-order"),
      n: proxied
        ? "re-emitted by the proxy — not your browser's own order"
        : "browser-specific; survives UA spoofing",
    },
    { k: "request line", v: `${dm("method")} ${dm("url")}` },
  ];

  const derived: Row[] = [
    { k: "client IP (x-forwarded-for)", v: fwd?.split(",")[0]?.trim() ?? "no proxy header", n: viaProxy && "your real address, forwarded by the proxy" },
    { k: "proxy chain", v: fwd ?? "direct connection" },
    { k: "x-real-ip", v: h.get("x-real-ip") ?? undefined },
    { k: "Host requested", v: h.get("host") ?? undefined },
    { k: "User-Agent", v: ua },
    { k: "UA length", v: ua.length, n: "reduced-UA is about 110 characters" },
    { k: "Accept", v: h.get("accept") ?? undefined },
    { k: "Accept-Encoding", v: h.get("accept-encoding") ?? undefined, n: "compression support" },
    { k: "Accept-Language (raw)", v: h.get("accept-language") ?? undefined },
    { k: "preferred language", v: h.get("accept-language")?.split(",")[0] ?? undefined },
    { k: "language count", v: h.get("accept-language")?.split(",").length ?? undefined, n: "ranked list, high entropy" },
    { k: "DNT header", v: h.get("dnt") ?? "not sent" },
    { k: "Sec-GPC header", v: h.get("sec-gpc") ?? "not sent" },
    { k: "Sec-Fetch-Site", v: h.get("sec-fetch-site") ?? undefined },
    { k: "Sec-Fetch-Mode", v: h.get("sec-fetch-mode") ?? undefined },
    { k: "Sec-Fetch-Dest", v: h.get("sec-fetch-dest") ?? undefined },
    { k: "Sec-Fetch-User", v: h.get("sec-fetch-user") ?? undefined },
    { k: "Referer", v: h.get("referer") ?? "none — direct navigation" },
    { k: "Upgrade-Insecure-Requests", v: h.get("upgrade-insecure-requests") ?? undefined },
    { k: "Priority", v: h.get("priority") ?? undefined },
    { k: "cookies sent", v: c.getAll().length },
    { k: "cookie names", v: c.getAll().map((x) => x.name).join(", ") || "none" },
    { k: "cookie bytes", v: (h.get("cookie") ?? "").length },
    { k: "server time (UTC)", v: new Date().toISOString() },
    { k: "server epoch ms", v: dm("server-epoch-ms"), n: "compare against your own clock" },
    { k: "server uptime", v: dm("server-uptime-s") ? `${dm("server-uptime-s")} s` : undefined },
    { k: "server timezone", v: Intl.DateTimeFormat().resolvedOptions().timeZone },
    { k: "runtime", v: `Node ${process.version} · ${process.platform}/${process.arch}` },
  ];

  return [
    {
      id: "request-headers",
      title: "HTTP Request Headers",
      note: "Every header the browser attached to the request for this page, read server-side. This is what a site knows before one line of JavaScript runs.",
      rows: headerRows,
    },
    {
      id: "client-hints",
      title: "Client Hints Received",
      note: "This server sends Accept-CH and Critical-CH asking for high-entropy hints — processor architecture, exact browser build, device model, color-scheme preference. The browser then volunteers them on every subsequent request, no script required.",
      rows: hintRows,
    },
    {
      id: "connection",
      title: "Connection & Protocol",
      note: proxied
        ? "Facts read from the TCP socket, below the HTTP layer. This deployment sits behind a hosting proxy, so the socket here belongs to that proxy and the headers have been re-emitted by it: the ordering below is the proxy's, not your browser's. Run the site directly, with no proxy in front, and this section reports your browser's own header order — a passive fingerprint that survives user-agent spoofing."
        : "Facts from the TCP socket itself, below the HTTP layer. Header ordering in particular is a passive fingerprint: each browser engine emits headers in its own fixed order regardless of what the user-agent string claims.",
      rows: connectionRows,
    },
    {
      id: "server-derived",
      title: "Server-Derived Context",
      note: "What the server infers from the request. No external lookup is performed — no IP-geolocation service, no analytics endpoint. Nothing about this session leaves the machine.",
      rows: derived,
    },
  ];
}

export default async function Page() {
  const server = await serverSections();
  const c = await cookies();
  // Stable across reloads once the visitor cookie exists, so the CSS probes can
  // record a JavaScript-disabled visit and still be reported here afterwards.
  const probeKey = c.get("dm_visitor")?.value ?? randomUUID().slice(0, 18);

  return (
    <main className="mx-auto max-w-page px-4 pb-24 sm:px-6">
      <SiteHeader
        current="data"
        title="What this page learned about you"
        lede="Everything a single web page can work out about the browser, device and person that requested it. The plain-English findings come first — each expands to the exact values behind it — and the complete field-by-field record follows."
        note="Every value is computed and displayed locally. Nothing is transmitted, and no part of this page contacts another company."
      />
      <ClientProbe serverSections={server} probeKey={probeKey} />
      <footer className="mt-16 border-t border-rule pt-4 text-sm leading-relaxed text-ink-muted">
        <p className="max-w-[76ch]">
          Built with FingerprintJS, ua-parser-js and detectIncognito alongside
          direct platform probes. Sections marked “granted” run only after you
          approve a prompt. Values reading “not reported” mean the browser
          withheld them or has no support.
        </p>
      </footer>
    </main>
  );
}
