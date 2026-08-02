import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireAllowedPerson } from "@/lib/auth/person";

/**
 * The original single-file tutor, served verbatim.
 *
 * This is temporary scaffolding with two jobs: it keeps the working app reachable while
 * the React port is built, and docs/math-table.html is the oracle the differential tests
 * check the port against (see scripts/oracle.mjs).
 *
 * At cutover both this route and the HTML move to _archive/ — never deleted.
 *
 * Do not add features here. Anything the tutor needs belongs in the React port.
 */

const SIGN_OUT_LINK = `<a href="/sign-out" style="position:fixed;right:14px;bottom:14px;z-index:99;font:500 13px/1 ui-sans-serif,-apple-system,sans-serif;color:#6E6053;background:#FFFCF7;border:1px solid #EADFCE;border-radius:999px;padding:9px 14px;text-decoration:none;box-shadow:0 1px 2px rgba(61,53,44,.05)">Sign out</a>`;

const HOME_LINK = `<a href="/" style="position:fixed;left:14px;bottom:14px;z-index:99;font:500 13px/1 ui-sans-serif,-apple-system,sans-serif;color:#6E6053;background:#FFFCF7;border:1px solid #EADFCE;border-radius:999px;padding:9px 14px;text-decoration:none;box-shadow:0 1px 2px rgba(61,53,44,.05)">&larr; All topics</a>`;

// The file cannot change at runtime, so compose once rather than re-reading ~200KB per
// request.
let cached: string | null = null;

async function composed() {
  if (cached) return cached;
  const html = await readFile(
    path.join(process.cwd(), "docs", "math-table.html"),
    "utf8",
  );
  // Function replacer, not a string: String.replace interprets $&, $` and $1 in a string
  // replacement, and this markup contains $-free text today but the next edit might not.
  cached = html.replace("</body>", () => `${HOME_LINK}${SIGN_OUT_LINK}\n</body>`);
  return cached;
}

export async function GET() {
  await requireAllowedPerson();

  return new Response(await composed(), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
