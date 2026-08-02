import { getDb } from "./index";
import { people } from "./schema";

// tsx transpiles to CJS, so top-level await fails here. Wrap it.

const ALLOWED = [
  { email: "wadetcooper@gmail.com", displayName: "Wade" },
  { email: "clementine.m.cooper@gmail.com", displayName: "Clementine" },
  { email: "jasper.r.cooper@gmail.com", displayName: "Jasper" },
];

async function main() {
  const db = getDb();

  // Insert-or-ignore rather than check-then-insert: two concurrent runs both see nothing,
  // both insert, and one silently wins. This is also what makes re-seeding safe — it will
  // never clobber a clerk_user_id that has already been backfilled.
  await db
    .insert(people)
    .values(ALLOWED.map((p) => ({ ...p, email: p.email.toLowerCase() })))
    .onConflictDoNothing({ target: people.email });

  const rows = await db.select().from(people);
  console.table(
    rows.map((r) => ({
      email: r.email,
      name: r.displayName,
      linked: r.clerkUserId ? "yes" : "no",
      revoked: r.revokedAt ? "YES" : "no",
    })),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
