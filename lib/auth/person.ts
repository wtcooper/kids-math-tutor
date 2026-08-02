import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq, isNull, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { people, type Person } from "@/lib/db/schema";

/**
 * Authentication is Clerk's job. Authorization is ours.
 *
 * Clerk's own allowlist governs sign-up only — removing someone from it does not sign
 * them out and does not stop them signing back in. This table is the thing that actually
 * controls access, and revoking is a single row update.
 *
 * Resolution order matters: clerk_user_id first (fast, stable within an instance), then
 * email with a backfill. The email fallback is what makes a future move to a Clerk
 * production instance survivable — that has a separate user pool, so every clerk id
 * changes while the emails do not.
 *
 * cache() so several callers in one request share a single database round trip.
 */
export const getCurrentPerson = cache(async (): Promise<Person | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const db = getDb();

  const [byClerkId] = await db
    .select()
    .from(people)
    .where(and(eq(people.clerkUserId, userId), isNull(people.revokedAt)))
    .limit(1);
  if (byClerkId) return byClerkId;

  // Not linked yet. Match on the verified primary email and adopt the row.
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
  if (!email) return null;

  const [byEmail] = await db
    .select()
    .from(people)
    .where(and(eq(people.email, email), isNull(people.revokedAt)))
    .limit(1);
  if (!byEmail) return null;

  // Backfill. If two requests race here they write the same value, so last-write-wins
  // is correct and no locking is needed.
  const [linked] = await db
    .update(people)
    .set({ clerkUserId: userId })
    .where(eq(people.id, byEmail.id))
    .returning();

  return linked ?? byEmail;
});

/**
 * Call this at the top of every gated page and every API route — not only in a layout.
 *
 * A layout's children can begin rendering before the layout's redirect lands, which puts
 * the content into the RSC payload where it is readable from view-source. The layout may
 * call this too (it is cached, so it costs nothing), but the page-level call is the
 * actual enforcement.
 */
export async function requireAllowedPerson(): Promise<Person> {
  const person = await getCurrentPerson();
  if (!person) redirect("/no-access");
  return person;
}

/**
 * The API equivalent. Returns the person, or a 401 JSON Response to return as-is:
 *
 *   const gate = await requireApiPerson();
 *   if (gate instanceof Response) return gate;
 *
 * Never redirects. A fetch that follows a redirect into sign-in HTML fails on
 * res.json() with an error pointing nowhere near the cause, so API routes must always
 * answer with JSON. proxy.ts deliberately leaves /api alone for the same reason.
 */
export async function requireApiPerson(): Promise<Person | Response> {
  const person = await getCurrentPerson();
  if (!person) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  return person;
}
