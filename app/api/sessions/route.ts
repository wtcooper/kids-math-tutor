import { and, eq } from "drizzle-orm";
import { requireApiPerson } from "@/lib/auth/person";
import { getDb } from "@/lib/db";
import { gameSessions } from "@/lib/db/schema";
import { BY_ID } from "@/lib/topics";
import { GAMES } from "@/lib/games";

interface Body {
  clientSessionId: string;
  topicId: string;
  level: number;
}

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  const gate = await requireApiPerson();
  if (gate instanceof Response) return gate;

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return badRequest("body must be JSON");
  }

  const { clientSessionId, topicId, level } = body ?? {};
  if (typeof clientSessionId !== "string" || clientSessionId.length < 8) {
    return badRequest("clientSessionId required");
  }

  const topic = BY_ID[topicId];
  const game = GAMES[topicId];
  if (!topic || !game) return badRequest("unknown topic");
  if (!Number.isInteger(level) || level < 1 || level > topic.levels.length) {
    return badRequest("level out of range");
  }

  const db = getDb();

  // Insert-or-ignore rather than check-then-insert: two concurrent requests both see
  // nothing, both insert, and one silently wins. The unique index on
  // (person_id, client_session_id) makes a retried POST idempotent.
  await db
    .insert(gameSessions)
    .values({ personId: gate.id, gameId: game.id, topicId, level, clientSessionId })
    .onConflictDoNothing();

  const [row] = await db
    .select({ id: gameSessions.id })
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.personId, gate.id),
        eq(gameSessions.clientSessionId, clientSessionId),
      ),
    )
    .limit(1);

  if (!row) return Response.json({ error: "could not open session" }, { status: 500 });

  return Response.json({ sessionId: row.id });
}
