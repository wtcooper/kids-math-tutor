import { readFile } from "node:fs/promises";
import path from "node:path";

// The tutor is one self-contained HTML document with its own <html> shell, so
// it is served as-is rather than wrapped in a React page. The gate lives in
// proxy.ts; by the time this runs there is a session.

const SIGN_OUT_LINK = `<a href="/sign-out" style="position:fixed;right:14px;bottom:14px;z-index:99;font:500 13px/1 ui-sans-serif,-apple-system,sans-serif;color:#6E6053;background:#FFFCF7;border:1px solid #EADFCE;border-radius:999px;padding:9px 14px;text-decoration:none;box-shadow:0 1px 2px rgba(61,53,44,.05)">Sign out</a>`;

export async function GET() {
  const html = await readFile(
    path.join(process.cwd(), "docs", "math-table.html"),
    "utf8",
  );

  return new Response(html.replace("</body>", `${SIGN_OUT_LINK}\n</body>`), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
