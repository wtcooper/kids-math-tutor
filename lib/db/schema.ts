import {
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Who is allowed in.
 *
 * Clerk answers "who are you"; this table answers "may you in". Keeping them apart
 * means revocation actually works (delete a row) rather than Clerk's allowlist
 * semantics, which govern sign-up only and leave existing sessions alone.
 *
 * `email` is the durable key and `clerk_user_id` is backfilled on first sign-in, so a
 * future move to a Clerk production instance — which has a separate user pool and
 * different ids — does not orphan anyone's progress.
 */
export const people = pgTable("people", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  clerkUserId: text("clerk_user_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const gameSessions = pgTable(
  "game_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    gameId: text("game_id").notNull(),
    topicId: text("topic_id").notNull(),
    level: integer("level").notNull(),
    // Minted in the browser so a retried POST is idempotent rather than duplicating.
    clientSessionId: text("client_session_id").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("game_sessions_person_client_key").on(t.personId, t.clientSessionId),
    index("game_sessions_person_topic_idx").on(t.personId, t.topicId, t.startedAt),
  ],
);

/**
 * One row per thing she did.
 *
 * Store inputs, derive outputs: there is deliberately no `correct` column and no
 * mastery/xp table. Correctness is a pure function of prompt + response, recomputed on
 * read with the same lib/math code the game uses — so fixing a scoring bug retroactively
 * fixes history instead of leaving rows frozen against that day's rules.
 *
 * It is also the safer product choice: with nothing scored persisted, there is no number
 * to accidentally surface, and the design forbids comparison.
 */
export const gameAttempts = pgTable(
  "game_attempts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => gameSessions.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    prompt: jsonb("prompt").notNull(),
    response: jsonb("response").notNull(),
    elapsedMs: integer("elapsed_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("game_attempts_session_seq_key").on(t.sessionId, t.seq)],
);

export type Person = typeof people.$inferSelect;
export type GameSession = typeof gameSessions.$inferSelect;
export type GameAttempt = typeof gameAttempts.$inferSelect;
