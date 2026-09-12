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
import { parse } from "node:url";
import next from "next";

const PORT = Number(process.env.PORT) || 3939;
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, turbopack: true, hostname: "localhost", port: PORT });
const handle = app.getRequestHandler();

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

app.prepare().then(async () => {
  const hosts = ["127.0.0.1", "::1"];
  const bound = (await Promise.all(hosts.map(listen))).filter(Boolean);
  if (!bound.length) throw new Error("could not bind to any loopback address");

  console.log(
    `\n  Session Context — ${dev ? "development, hot reload" : "production"} · Turbopack\n` +
      `  →  http://localhost:${PORT}\n` +
      `  →  http://127.0.0.1:${PORT}\n`
  );
});
