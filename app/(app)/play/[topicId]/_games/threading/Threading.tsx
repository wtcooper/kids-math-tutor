"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type Phaser from "phaser";
import { PhaserGame, type GameBus, type GameEvent } from "@/components/game/PhaserGame";
import { createLaneScene } from "./LaneScene";
import { card, type FactKind } from "@/lib/math/facts";
import { RoundEnd, type MissedFact } from "@/components/game/RoundEnd";
import { GameChrome } from "@/components/game/GameChrome";
import { useAttemptRecorder } from "@/components/game/useAttemptRecorder";

interface Props {
  topicId: string;
  variant: string;
  levels: readonly string[];
  initialLevel: number;
}

/** How many links before the round-end panel. Small enough to always be finishable. */
const ROUND_LENGTH = 12;

export default function Threading({ topicId, variant, levels, initialLevel }: Props) {
  const kind = (variant === "div" ? "div" : "mul") as FactKind;
  const [level, setLevel] = useState(initialLevel);
  const [roundOver, setRoundOver] = useState<MissedFact[] | null>(null);
  const busRef = useRef<GameBus | null>(null);

  const recorder = useAttemptRecorder({ topicId, level });

  // Wrong pairs this round, keyed so a repeat does not list the same fact twice.
  const missesRef = useRef(new Map<string, MissedFact>());
  const countRef = useRef(0);

  const onEvent = useCallback(
    (e: GameEvent) => {
      if (e.type !== "attempt") return;
      recorder.record(e);

      const prompt = e.prompt as { fam: number; other: number };
      const response = e.response as { ok: boolean };
      countRef.current += 1;

      if (!response.ok) {
        const key = `${prompt.fam}x${prompt.other}`;
        if (!missesRef.current.has(key)) {
          const c = card(kind, prompt.fam, prompt.other);
          missesRef.current.set(key, { q: c.q, a: c.a, hook: c.hook });
        }
      }

      if (countRef.current >= ROUND_LENGTH) {
        busRef.current?.send({ type: "pause" });
        setRoundOver([...missesRef.current.values()].slice(0, 3));
        void recorder.flush();
      }
    },
    [kind, recorder],
  );

  const createScenes = useMemo(
    () => (P: typeof Phaser) => [createLaneScene(P, { kind, level: initialLevel })],
    // Level changes are pushed through the bus, never by recreating the game.
    [kind, initialLevel],
  );

  const startNextRound = useCallback(() => {
    missesRef.current.clear();
    countRef.current = 0;
    setRoundOver(null);
    busRef.current?.send({ type: "resume" });
  }, []);

  const changeLevel = useCallback((next: number) => {
    setLevel(next);
    missesRef.current.clear();
    countRef.current = 0;
    setRoundOver(null);
    busRef.current?.send({ type: "level:set", level: next });
  }, []);

  return (
    <GameChrome
      title="Threading"
      topicId={topicId}
      levels={levels}
      level={level}
      onLevel={changeLevel}
      instructions="Drag a line between two numbers that make the target."
    >
      <PhaserGame createScenes={createScenes} onEvent={onEvent} busRef={busRef} />
      {roundOver ? (
        <RoundEnd
          topicId={topicId}
          level={level}
          missed={roundOver}
          onAgain={startNextRound}
        />
      ) : null}
    </GameChrome>
  );
}
