import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy on purpose, and a plain function on purpose.
//
// `neon(process.env.DATABASE_URL!)` at module scope throws during `next build` —
// Next evaluates top-level module code while building, so a missing variable takes
// the build down before anything renders.
//
// A Proxy wrapper is the obvious way to get laziness and it is wrong: libraries that
// check for a method or iterate properties get answered by the proxy instead, and the
// symptom is a hang with no error.

let client: ReturnType<typeof createClient> | null = null;

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  return drizzle(neon(url), { schema });
}

export function getDb() {
  if (!client) client = createClient();
  return client;
}
