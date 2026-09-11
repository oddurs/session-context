/**
 * Production server. Exists so the page can report connection-level facts that
 * Next's `headers()` cannot see: raw header order, HTTP version and socket
 * details. Those are injected as synthetic `x-dm-*` request headers and
 * filtered back out of the displayed header table.
 */
import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";

const PORT = Number(process.env.PORT) || 20000 + Math.floor(Math.random() * 40000);
const HOST = process.env.HOST || "127.0.0.1";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, turbopack: true, hostname: HOST, port: PORT });
const handle = app.getRequestHandler();

/** requests seen per TCP connection, to show keep-alive reuse */
const perSocket = new WeakMap();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const sock = req.socket;
    const count = (perSocket.get(sock) ?? 0) + 1;
    perSocket.set(sock, count);

    req.headers["x-dm-header-order"] = req.rawHeaders
      .filter((_, i) => i % 2 === 0)
      .join(", ");
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

    handle(req, res, parse(req.url, true));
  });

  server.keepAliveTimeout = 65000;
  server.listen(PORT, HOST, () => {
    console.log(
      `\n  Session Context ready (${dev ? "dev" : "production"} · Turbopack)\n  →  http://${HOST}:${PORT}\n`
    );
  });
});
