"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type Phaser from "phaser";
import { PhaserGame, type GameBus, type GameEvent } from "@/components/game/PhaserGame";
import { createGridScene } from "./GridScene";
import { GameChrome } from "@/components/game/GameChrome";
import { FactorRoundEnd, type FactorRoundResult } from "./FactorRoundEnd";
import { useAttemptRecorder } from "@/components/game/useAttemptRecorder";

interface Props {
  topicId: string;
  variant: string;
  levels: readonly string[];
  initialLevel: number;
}

export default function Munchers({ topicId, levels, initialLevel }: Props) {
  const [level, setLevel] = useState(initialLevel);
  const [result, setResult] = useState<FactorRoundResult | null>(null);
  const busRef = useRef<GameBus | null>(null);
  const recorder = useAttemptRecorder({ topicId, level });

  const onEvent = useCallback(
    (e: GameEvent) => {
      if (e.type === "attempt") {
        recorder.record(e);
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
      title="Munchers"
      topicId={topicId}
      levels={levels}
      level={level}
      onLevel={changeLevel}
      instructions="Tap a neighbouring square to move, tap your own square to eat. Eat only the numbers that fit the rule."
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
