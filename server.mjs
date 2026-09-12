/**
 * Production and development server.
 *
 * It exists so the page can report connection-level facts that Next's own
 * `headers()` cannot see: raw header order, HTTP version and socket details.
 * Those are injected as synthetic `x-dm-*` request headers and filtered back
 * out of the displayed header table.
 *
 * It listens on both loopback addresses so `localhost` and `127.0.0.1` are
 * both reachable — the third-party embedding demonstration needs two origins,
 * and uses whichever hostname you did not open as its cross-site frame.
 */
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { parse } from "node:url";
import next from "next";

const PORT = Number(process.env.PORT) || 3939;
const dev = process.env.NODE_ENV !== "production";

/**
 * Locally the server binds both loopback addresses, so `localhost` and
 * `127.0.0.1` are both reachable — the third-party embedding demonstration
 * needs two origins and uses whichever hostname you did not open.
 *
 * A hosted deployment must instead accept connections from outside the
 * container, so it binds every interface. Set HOST to override either.
 */
const hosted = Boolean(process.env.HOST || process.env.RAILWAY_ENVIRONMENT);
const HOSTS = process.env.HOST
  ? [process.env.HOST]
  : hosted
    ? ["::"]
    : ["127.0.0.1", "::1"];

const app = next({ dev, turbopack: true, hostname: "localhost", port: PORT });
const handle = app.getRequestHandler();

const STATIC_PREFIX = "/_next/static/";
const CONTENT_TYPES = {
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

/**
 * Serve the Brotli copies written by scripts/precompress.mjs.
 *
 * Next only produces gzip and the platform edge adds nothing, so without this
 * every visitor downloads about 20% more than they need to. Anything without a
 * `.br` neighbour, or any client that did not ask for Brotli, falls straight
 * through to Next.
 */
function serveBrotli(req, res) {
  if (!req.url?.startsWith(STATIC_PREFIX)) return false;
  if (!/\bbr\b/.test(req.headers["accept-encoding"] ?? "")) return false;

  const path = req.url.split("?")[0].slice(STATIC_PREFIX.length);
  // Refuse anything that tries to climb out of the static directory.
  const resolved = join(".next/static", normalize(path));
  if (!resolved.startsWith(".next/static/")) return false;

  const brotli = `${resolved}.br`;
  if (!existsSync(brotli)) return false;

  const type = CONTENT_TYPES[extname(resolved)];
  if (!type) return false;

  res.writeHead(200, {
    "Content-Type": type,
    "Content-Encoding": "br",
    "Content-Length": statSync(brotli).size,
    // Build output is content-addressed, so it can be cached forever.
    "Cache-Control": "public, max-age=31536000, immutable",
    Vary: "Accept-Encoding",
  });
  createReadStream(brotli).pipe(res);
  return true;
}

/** requests seen per TCP connection, to show keep-alive reuse */
const perSocket = new WeakMap();

function annotate(req) {
  const sock = req.socket;
  const count = (perSocket.get(sock) ?? 0) + 1;
  perSocket.set(sock, count);

  req.headers["x-dm-header-order"] = req.rawHeaders.filter((_, i) => i % 2 === 0).join(", ");
  req.headers["x-dm-header-count"] = String(req.rawHeaders.length / 2);
  req.headers["x-dm-http-version"] = req.httpVersion;
  req.headers["x-dm-method"] = req.method || "";
  req.headers["x-dm-url"] = req.url || "";
  req.headers["x-dm-remote-addr"] = sock.remoteAddress || "";
  req.headers["x-dm-remote-port"] = String(sock.remotePort || "");
  req.headers["x-dm-remote-family"] = sock.remoteFamily || "";
  req.headers["x-dm-local-addr"] = `${sock.localAddress}:${sock.localPort}`;
  req.headers["x-dm-encrypted"] = sock.encrypted ? "yes (TLS)" : "no (plain HTTP)";
  req.headers["x-dm-socket-requests"] = String(count);
  req.headers["x-dm-socket-bytes-read"] = String(sock.bytesRead);
  req.headers["x-dm-server-epoch-ms"] = String(Date.now());
  req.headers["x-dm-server-uptime-s"] = process.uptime().toFixed(1);
}

/** One listener per loopback address, sharing a single Next instance. */
function listen(host) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      annotate(req);
      if (serveBrotli(req, res)) return;
      handle(req, res, parse(req.url, true));
    });
    // Hot reloading talks over a websocket, which needs the upgrade handler.
    // It is only available once prepare() has resolved.
    server.on("upgrade", (req, socket, head) => app.getUpgradeHandler()(req, socket, head));
    server.keepAliveTimeout = 65000;
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `\n  Port ${PORT} is already in use on ${host}.\n` +
            `  Stop the other process, or run with PORT=<other> npm run dev\n`
        );
        process.exit(1);
      }
      if (err.code === "EADDRNOTAVAIL" || err.code === "EAFNOSUPPORT") resolve(null);
      else throw err;
    });
    server.listen(PORT, host, () => resolve(server));
  });
}

/**
 * A crash should be visible in the platform logs and should end the process,
 * so the supervisor restarts it, rather than leaving a half-dead server
 * answering health checks.
 */
process.on("unhandledRejection", (reason) => {
  console.error("[fatal] unhandled rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[fatal] uncaught exception:", error);
  process.exit(1);
});
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    console.log(`[shutdown] ${signal} received`);
    process.exit(0);
  });
}

app.prepare().then(async () => {
  const bound = (await Promise.all(HOSTS.map(listen))).filter(Boolean);
  if (!bound.length) throw new Error(`could not bind to any of: ${HOSTS.join(", ")}`);

  const where = hosted
    ? `  →  listening on ${HOSTS.join(", ")}:${PORT}\n`
    : `  →  http://localhost:${PORT}\n  →  http://127.0.0.1:${PORT}\n`;
  console.log(
    `\n  Session Context — ${dev ? "development, hot reload" : "production"} · Turbopack\n${where}`
  );
});
