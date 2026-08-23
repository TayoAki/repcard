/**
 * Sliding-window rate limiter (two-window weighted approximation, a la
 * Cloudflare): the previous window's count is weighted by how much of it
 * still overlaps the rolling window, so a burst at a boundary cannot double
 * the allowance the way a fixed window would.
 *
 * Per server instance by design - limits are approximate brakes on abuse; a
 * shared store (Redis) is the upgrade if instances multiply and hard global
 * limits matter.
 */
type Window = { start: number; count: number; prevCount: number };

// globalThis-backed: the dev server re-evaluates modules per request, which
// would otherwise reset the window on every hit. No-op in production.
const globalCache = globalThis as { __repcardWindows?: Map<string, Window> };
const windows = (globalCache.__repcardWindows ??= new Map<string, Window>());

const SWEEP_AT = 10_000;

export function allowRequest(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();

  if (windows.size > SWEEP_AT) {
    for (const [k, w] of windows) if (now - w.start > windowMs * 2) windows.delete(k);
  }

  let w = windows.get(key);
  if (!w) {
    w = { start: now, count: 0, prevCount: 0 };
    windows.set(key, w);
  }

  // Roll the window forward, carrying the finished window's count.
  const elapsed = now - w.start;
  if (elapsed >= windowMs) {
    const windowsPassed = Math.floor(elapsed / windowMs);
    w.prevCount = windowsPassed === 1 ? w.count : 0;
    w.start += windowsPassed * windowMs;
    w.count = 0;
  }

  const overlap = 1 - (now - w.start) / windowMs; // fraction of prev window still in range
  const effective = w.count + w.prevCount * overlap;
  if (effective >= max) return false;

  w.count += 1;
  return true;
}

export const clientIp = (request: Request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

export const tooManyRequests = () =>
  Response.json({ message: "Too many requests - slow down" }, { status: 429 });
