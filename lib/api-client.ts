/**
 * Client-side fetch helper for our own API.
 *
 * Why this exists rather than a bare fetch: on a Clerk **development** instance the
 * middleware handshake redirects unauthenticated requests to /sign-in *before* any
 * route handler or proxy callback runs (observable as `x-clerk-auth-reason:
 * dev-browser-missing`). There is no per-route opt-out. So a signed-out or
 * session-expired call returns a 307 into sign-in HTML, and a naive `res.json()` dies
 * with "Unexpected token '<'" — an error pointing nowhere near the cause.
 *
 * Route handlers still answer a proper 401 JSON (see requireApiPerson), which is what
 * happens on a production instance and once the handshake is satisfied. This helper
 * makes both paths look the same to callers.
 */

export class AuthExpiredError extends Error {
  constructor() {
    super("Signed out — reload to sign in again.");
    this.name = "AuthExpiredError";
  }
}

async function parse<T>(res: Response): Promise<T> {
  // A redirect into the sign-in page means the session is gone, whatever the status.
  if (res.redirected || res.status === 401) throw new AuthExpiredError();

  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new AuthExpiredError();

  const body = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `request failed (${res.status})`);
  return body;
}

export async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parse<T>(res);
}

/**
 * Fire-and-forget flush for page teardown. sendBeacon cannot set headers, but it does
 * send cookies, which is all Clerk needs. Falls back to keepalive fetch.
 */
export function beaconJson(url: string, payload: unknown): void {
  const body = JSON.stringify(payload);
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const ok = navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    if (ok) return;
  }
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
