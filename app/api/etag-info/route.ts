import { etagStore } from "@/lib/server-store";

export const dynamic = "force-dynamic";

/** What the server remembers about one cache-stored identifier. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const rec = etagStore.get(id);
  return Response.json(
    rec
      ? {
          known: true,
          hits: rec.hits,
          firstSeen: new Date(rec.firstSeen).toISOString(),
          lastSeen: new Date(rec.lastSeen).toISOString(),
        }
      : { known: false },
    { headers: { "Cache-Control": "no-store" } }
  );
}
