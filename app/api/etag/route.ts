import { randomUUID } from "node:crypto";
import { etagStore } from "@/lib/server-store";

export const dynamic = "force-dynamic";

/**
 * An identifier that lives in the HTTP cache rather than in storage.
 *
 * The first response carries `ETag: "<id>"`. The browser caches it, and on
 * every later request revalidates with `If-None-Match: "<id>"` — handing the
 * identifier straight back. It survives clearing cookies and site data,
 * because it is not site data: it is the cache.
 */
export async function GET(req: Request) {
  const sent = req.headers
    .get("if-none-match")
    ?.replace(/^W\//, "")
    .replace(/"/g, "")
    .trim();

  const cacheHeaders = {
    "Cache-Control": "private, max-age=0, must-revalidate",
    Vary: "Accept",
  };

  if (sent && etagStore.has(sent)) {
    const rec = etagStore.get(sent)!;
    rec.hits += 1;
    rec.lastSeen = Date.now();
    // 304: no body. The browser serves the identifier from its own cache.
    return new Response(null, {
      status: 304,
      headers: { ETag: `"${sent}"`, ...cacheHeaders },
    });
  }

  const id = randomUUID().slice(0, 18);
  etagStore.set(id, { firstSeen: Date.now(), lastSeen: Date.now(), hits: 1 });
  return new Response(JSON.stringify({ id }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ETag: `"${id}"`,
      ...cacheHeaders,
    },
  });
}
