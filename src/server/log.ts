/**
 * Structured JSON logging for API routes - one line per event, parseable by
 * any log drain. `reportError` is the single seam for wiring a provider
 * (Sentry/etc.) later: which SDK fits depends on the final hosting runtime
 * (Node vs edge), so the hook stays provider-neutral until that's chosen.
 */
type LogData = Record<string, unknown>;

const line = (level: "info" | "error", event: string, data: LogData) =>
  JSON.stringify({ t: new Date().toISOString(), level, event, ...data });

export const logEvent = (event: string, data: LogData = {}) =>
  console.log(line("info", event, data));

export function reportError(route: string, error: unknown, data: LogData = {}) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(
    line("error", "route_error", {
      route,
      message: err.message,
      stack: err.stack?.split("\n").slice(0, 4).join(" | "),
      ...data,
    }),
  );
}

/** Uniform 500 + structured log for unexpected route failures. */
export function serverError(route: string, error: unknown): Response {
  reportError(route, error);
  return Response.json({ message: "Something went wrong on our side" }, { status: 500 });
}
