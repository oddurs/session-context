import { cssStore } from "@/lib/server-store";

export const dynamic = "force-dynamic";

/** What the CSS probes told the server about one visitor key. */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("s") ?? "";
  const rec = cssStore.get(key);
  return Response.json(
    rec
      ? {
          known: true,
          firstSeen: new Date(rec.firstSeen).toISOString(),
          lastSeen: new Date(rec.lastSeen).toISOString(),
          features: rec.features,
        }
      : { known: false, features: {} },
    { headers: { "Cache-Control": "no-store" } }
  );
}
