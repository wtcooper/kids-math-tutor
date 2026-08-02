import { and, eq } from "drizzle-orm";
import { requireApiPerson } from "@/lib/auth/person";
import { getDb } from "@/lib/db";
import { gameSessions } from "@/lib/db/schema";
import { BY_ID } from "@/lib/topics";
import { GAME_BY_SLUG } from "@/lib/games";

interface Body {
  clientSessionId: string;
  /** Which game — several games can teach the same topic, so the topic is not enough. */
  gameSlug: string;
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

  const { clientSessionId, gameSlug, level } = body ?? {};
  if (typeof clientSessionId !== "string" || clientSessionId.length < 8) {
    return badRequest("clientSessionId required");
  }

  const game = GAME_BY_SLUG[gameSlug];
  const topic = game ? BY_ID[game.topicId] : undefined;
  if (!game || !topic) return badRequest("unknown game");
  if (!Number.isInteger(level) || level < 1 || level > topic.levels.length) {
    return badRequest("level out of range");
  }

  const db = getDb();

  // Insert-or-ignore rather than check-then-insert: two concurrent requests both see
  // nothing, both insert, and one silently wins. The unique index on
  // (person_id, client_session_id) makes a retried POST idempotent.
  await db
    .insert(gameSessions)
    .values({
      personId: gate.id,
      gameId: game.slug,
      topicId: game.topicId,
      level,
      clientSessionId,
    })
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
