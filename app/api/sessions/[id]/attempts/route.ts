import { and, eq } from "drizzle-orm";
import { requireApiPerson } from "@/lib/auth/person";
import { getDb } from "@/lib/db";
import { gameAttempts, gameSessions } from "@/lib/db/schema";

interface Attempt {
  seq: number;
  prompt: unknown;
  response: unknown;
  elapsedMs: number;
}

const MAX_BATCH = 500;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireApiPerson();
  if (gate instanceof Response) return gate;

  const { id: sessionId } = await params;

  let attempts: Attempt[];
  try {
    attempts = await request.json();
  } catch {
    return Response.json({ error: "body must be JSON" }, { status: 400 });
  }
  if (!Array.isArray(attempts)) {
    return Response.json({ error: "body must be an array" }, { status: 400 });
  }
  if (attempts.length === 0) return Response.json({ written: 0 });
  if (attempts.length > MAX_BATCH) {
    return Response.json({ error: `at most ${MAX_BATCH} per request` }, { status: 413 });
  }

  const db = getDb();

  // Ownership is enforced by matching person_id as well as the session id. Checking only
  // the id would be a textbook IDOR, and it is easy to miss because person_id never
  // appears in the URL.
  const [session] = await db
    .select({ id: gameSessions.id })
    .from(gameSessions)
    .where(and(eq(gameSessions.id, sessionId), eq(gameSessions.personId, gate.id)))
    .limit(1);

  if (!session) return Response.json({ error: "not found" }, { status: 404 });

  const rows = attempts
    .filter((a) => Number.isInteger(a?.seq) && Number.isFinite(a?.elapsedMs))
    .map((a) => ({
      sessionId: session.id,
      seq: a.seq,
      prompt: a.prompt ?? {},
      response: a.response ?? {},
      elapsedMs: Math.max(0, Math.round(a.elapsedMs)),
    }));

  if (rows.length === 0) return Response.json({ written: 0 });

  // One insert, never a loop — sequential round trips are where request time goes.
  // onConflictDoNothing against the (session_id, seq) unique index makes a replayed
  // flush harmless, which matters because the client also flushes on pagehide.
  await db.insert(gameAttempts).values(rows).onConflictDoNothing();

  return Response.json({ written: rows.length });
}
