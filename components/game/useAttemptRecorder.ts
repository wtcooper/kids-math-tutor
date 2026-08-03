"use client";

import { useCallback, useEffect, useRef } from "react";
import { AuthExpiredError, beaconJson, postJson } from "@/lib/api-client";
import { feedBeast } from "@/lib/beasts";
import { GAME_BY_SLUG } from "@/lib/games";
import type { GameEvent } from "./PhaserGame";

/**
 * Buffers attempts and flushes them in batches.
 *
 * A link every couple of seconds over a five-minute session is ~150 attempts. That has to
 * be two or three requests, not 150 — so the buffer flushes at round end and on page
 * teardown, and the server's (session_id, seq) unique index makes a replayed flush
 * harmless.
 *
 * The session row is opened lazily on the first attempt, so simply opening a game page
 * and wandering off does not create an empty session.
 */

interface Options {
  /** The game's route slug — several games can share a topic. */
  gameSlug: string;
  level: number;
}

interface PendingAttempt {
  seq: number;
  prompt: unknown;
  response: unknown;
  elapsedMs: number;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useAttemptRecorder({ gameSlug, level }: Options) {
  const bufferRef = useRef<PendingAttempt[]>([]);
  const seqRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const openingRef = useRef<Promise<string | null> | null>(null);
  const clientSessionIdRef = useRef(uuid());
  const disabledRef = useRef(false);

  // A new level is a new session, so progress is attributable to the right one.
  useEffect(() => {
    sessionIdRef.current = null;
    openingRef.current = null;
    clientSessionIdRef.current = uuid();
    seqRef.current = 0;
    bufferRef.current = [];
  }, [gameSlug, level]);

  const openSession = useCallback(async (): Promise<string | null> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    if (disabledRef.current) return null;
    if (!openingRef.current) {
      openingRef.current = postJson<{ sessionId: string }>("/api/sessions", {
        clientSessionId: clientSessionIdRef.current,
        gameSlug,
        level,
      })
        .then((r) => {
          sessionIdRef.current = r.sessionId;
          return r.sessionId;
        })
        .catch((err) => {
          // Losing progress is not worth interrupting play over. An expired session is
          // the expected case; anything else is logged and play continues.
          if (!(err instanceof AuthExpiredError)) console.warn("session open failed", err);
          disabledRef.current = true;
          return null;
        });
    }
    return openingRef.current;
  }, [gameSlug, level]);

  const record = useCallback(
    (e: GameEvent) => {
      if (e.type !== "attempt") return;
      bufferRef.current.push({
        seq: seqRef.current++,
        prompt: e.prompt,
        response: e.response,
        elapsedMs: e.elapsedMs,
      });
      // Every attempt, in any game, feeds that topic's creature in the Beast Book.
      const topicId = GAME_BY_SLUG[gameSlug]?.topicId;
      if (topicId) feedBeast(topicId);
      void openSession();
    },
    [openSession, gameSlug],
  );

  const flush = useCallback(async () => {
    const batch = bufferRef.current;
    if (batch.length === 0) return;
    const sessionId = await openSession();
    if (!sessionId) return;
    bufferRef.current = [];
    try {
      await postJson(`/api/sessions/${sessionId}/attempts`, batch);
    } catch (err) {
      if (!(err instanceof AuthExpiredError)) console.warn("attempt flush failed", err);
    }
  }, [openSession]);

  // Teardown flush. sendBeacon cannot set headers but does send cookies, which is all
  // Clerk needs. visibilitychange is the reliable signal on mobile Safari; pagehide
  // covers desktop navigation.
  useEffect(() => {
    const onLeave = () => {
      const batch = bufferRef.current;
      const sessionId = sessionIdRef.current;
      if (batch.length === 0 || !sessionId) return;
      bufferRef.current = [];
      beaconJson(`/api/sessions/${sessionId}/attempts`, batch);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onLeave();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onLeave);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onLeave);
      onLeave();
    };
  }, []);

  return { record, flush };
}
