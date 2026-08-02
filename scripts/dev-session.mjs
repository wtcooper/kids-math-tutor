/**
 * Development helper: mint a signed-in session for local verification.
 *
 * Clerk's development instance demands an emailed device-verification code on a new
 * device, which a headless browser cannot receive. Sign-in tokens are Clerk's documented
 * way around exactly that.
 *
 *   node scripts/dev-session.mjs            → creates the user if needed, prints a URL
 *   node scripts/dev-session.mjs --cleanup  → removes the user and its rows
 *
 * The user is a throwaway on a reserved example.com address. Never run against a
 * production Clerk instance.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EMAIL = "harness-temp@example.com";
const PASSWORD = "Sq7!vantageRidge42";
const BASE = process.env.BASE_URL ?? "http://localhost:3111";

const env = readFileSync(resolve(REPO, ".env.local"), "utf8");
const SK = env.match(/^CLERK_SECRET_KEY="?([^"\n]+)/m)?.[1];
if (!SK) throw new Error("CLERK_SECRET_KEY missing from .env.local");
if (!SK.startsWith("sk_test_")) {
  throw new Error("refusing to run against a non-development Clerk instance");
}

async function clerk(path, init = {}) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SK}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function db(body) {
  // A real file with normal imports rather than `tsx -e`: eval mode transpiles to CJS,
  // where top-level await fails and dynamic imports nest exports under `.default`.
  const file = resolve(REPO, "scripts", ".dev-session.tmp.ts");
  writeFileSync(
    file,
    `import { getDb } from "../lib/db";\n` +
      `import { people } from "../lib/db/schema";\n` +
      `import { eq } from "drizzle-orm";\n` +
      `void eq; void people; void getDb;\n` +
      `async function main() {\n${body}\n}\n` +
      `main().catch((e) => { console.error(e); process.exit(1); });\n`,
  );
  try {
    execFileSync("npx", ["dotenv", "-e", ".env.local", "--", "tsx", file], {
      cwd: REPO,
      stdio: "inherit",
    });
  } finally {
    rmSync(file, { force: true });
  }
}

async function findUser() {
  const list = await clerk(`/users?email_address=${encodeURIComponent(EMAIL)}`);
  return Array.isArray(list) && list.length ? list[0] : null;
}

async function main() {
  if (process.argv.includes("--cleanup")) {
    const u = await findUser();
    if (u) await clerk(`/users/${u.id}`, { method: "DELETE" });
    db(`
      const r = await getDb().delete(people).where(eq(people.email, "${EMAIL}")).returning();
      console.log("removed", r.length, "person row(s)");
    `);
    console.log("cleaned up");
    return;
  }

  let user = await findUser();
  if (!user) {
    user = await clerk("/users", {
      method: "POST",
      body: JSON.stringify({
        email_address: [EMAIL],
        password: PASSWORD,
        skip_password_checks: true,
        first_name: "Harness",
      }),
    });
    const eid = user.email_addresses?.[0]?.id;
    if (eid) {
      await clerk(`/email_addresses/${eid}`, {
        method: "PATCH",
        body: JSON.stringify({ verified: true, primary: true }),
      });
    }
  }

  db(`
    await getDb().insert(people)
      .values({ email: "${EMAIL}", displayName: "Harness" })
      .onConflictDoNothing({ target: people.email });
    console.log("person row present");
  `);

  const tok = await clerk("/sign_in_tokens", {
    method: "POST",
    body: JSON.stringify({ user_id: user.id, expires_in_seconds: 3600 }),
  });

  console.log(`${BASE}/sign-in?__clerk_ticket=${tok.token}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
