/**
 * A small fixed-window limiter for the two public endpoints.
 *
 * The stores behind them are already bounded, so this is about noise rather
 * than memory: a crawler hitting the probe pixel with fresh keys would
 * otherwise churn the map and fill the logs.
 */
type Bucket = { count: number; resetAt: number };

const WINDOW_MS = 60_000;
const MAX_CLIENTS = 10_000;

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    // Sweep expired entries occasionally rather than on every request.
    if (buckets.size > MAX_CLIENTS) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
      while (buckets.size > MAX_CLIENTS) {
        const oldest = buckets.keys().next().value;
        if (oldest === undefined) break;
        buckets.delete(oldest);
      }
    }
    return true;
  }

  bucket.count += 1;
  return bucket.count <= limit;
}

/** Best-effort client identity: the forwarded address, else the connection. */
export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
