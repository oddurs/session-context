import { rateLimit } from "@/lib/rate-limit";
import { recordCssHit } from "@/lib/server-store";

export const dynamic = "force-dynamic";

/** 1×1 transparent GIF. Requesting it is the signal; the pixel is irrelevant. */
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("s");
  const feature = url.searchParams.get("f");
  // Limited per probe key rather than per address: visitors behind a shared
  // office or campus address would otherwise truncate each other's results,
  // and a silently incomplete demonstration is worse than none.
  if (key && feature && rateLimit(`css:${key}`, 400)) {
    recordCssHit(key, feature);
  }

  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      // Never cache: we want to see the request on every page load.
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
