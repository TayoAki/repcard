/**
 * Sliding-window rate limiter, per server instance. In-memory is the right
 * tradeoff here: limits are per-instance approximations, which is fine for
 * brake-pumping abuse; a shared store (Redis) is the upgrade if instances
 * multiply and hard global limits matter.
 */
type Bucket = { count: number; resetAt: number };

// globalThis-backed: the dev server re-evaluates modules per request, which
// would otherwise reset the window on every hit. No-op in production.
const globalCache = globalThis as { __repcardBuckets?: Map<string, Bucket> };
const buckets = (globalCache.__repcardBuckets ??= new Map<string, Bucket>());
const SWEEP_AT = 10_000;

export function allowRequest(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > SWEEP_AT) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

export const clientIp = (request: Request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

export const tooManyRequests = () =>
  Response.json({ message: "Too many requests - slow down" }, { status: 429 });
