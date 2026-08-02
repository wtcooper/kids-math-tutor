"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type Phaser from "phaser";
import { PhaserGame, type GameBus, type GameEvent } from "@/components/game/PhaserGame";
import { createGridScene } from "./GridScene";
import { GameChrome } from "@/components/game/GameChrome";
import { FactorRoundEnd, type FactorRoundResult } from "./FactorRoundEnd";
import { useAttemptRecorder } from "@/components/game/useAttemptRecorder";
import type { HowTo } from "@/components/game/HowToPlay";
import type { GameProps } from "../../GameHost";
import styles from "./Munchers.module.css";

const HOW_TO: HowTo = {
  goal: "Clear the board of every number that fits the rule — and get more of them than the Grumps do.",
  controls: [
    "Tap a square next to you to step onto it.",
    "Tap the square you are standing on to eat it.",
    "Arrow keys to move, space to eat.",
  ],
  rules: [
    "The rule is written across the top. It changes every round.",
    "The Grumps eat the right numbers too — leave one sitting and they will take it.",
    "Eating a wrong number costs nothing. It just wobbles and stays put.",
    "If a Grump catches you, you pop back to the middle. Nothing is lost.",
  ],
};

interface Live {
  rule: string;
  yours: number;
  grumps: number;
  left: number;
}

export default function Munchers({
  slug,
  topicId,
  name,
  levels,
  initialLevel,
}: GameProps) {
  const [level, setLevel] = useState(initialLevel);
  const [result, setResult] = useState<FactorRoundResult | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const busRef = useRef<GameBus | null>(null);
  const recorder = useAttemptRecorder({ gameSlug: slug, level });

  const onEvent = useCallback(
    (e: GameEvent) => {
      if (e.type === "attempt") {
        recorder.record(e);
        return;
      }
      if (e.type === "state") {
        setLive(e.payload as Live);
        return;
      }
      if (e.type === "round:complete") {
        busRef.current?.send({ type: "pause" });
        setResult(e.payload as FactorRoundResult);
        void recorder.flush();
      }
    },
    [recorder],
  );

  const createScenes = useMemo(
    () => (P: typeof Phaser) => [createGridScene(P, { level: initialLevel })],
    [initialLevel],
  );

  const again = useCallback(() => {
    setResult(null);
    busRef.current?.send({ type: "resume" });
    busRef.current?.send({ type: "level:set", level });
  }, [level]);

  const changeLevel = useCallback((next: number) => {
    setLevel(next);
    setResult(null);
    busRef.current?.send({ type: "level:set", level: next });
  }, []);

  return (
    <GameChrome
      slug={slug}
      title={name}
      topicId={topicId}
      levels={levels}
      level={level}
      onLevel={changeLevel}
      instructions="Tap a square next to you to move, tap your own square to eat. Beat the Grumps to the right numbers."
      howTo={HOW_TO}
      status={
        live ? (
          <>
            <span className={`${styles.score} ${styles.you}`}>You {live.yours}</span>
            <span className={`${styles.score} ${styles.them}`}>Grumps {live.grumps}</span>
            <span className={styles.left}>{live.left} left on the board</span>
          </>
        ) : null
      }
    >
      <PhaserGame createScenes={createScenes} onEvent={onEvent} busRef={busRef} />
      {result ? (
        <FactorRoundEnd
          topicId={topicId}
          level={level}
          result={result}
          onAgain={again}
        />
      ) : null}
    </GameChrome>
  );
}
