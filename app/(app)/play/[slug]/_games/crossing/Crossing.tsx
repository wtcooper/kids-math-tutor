"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type Phaser from "phaser";
import { PhaserGame, type GameBus, type GameEvent } from "@/components/game/PhaserGame";
import { GameChrome } from "@/components/game/GameChrome";
import { useAttemptRecorder } from "@/components/game/useAttemptRecorder";
import type { HowTo } from "@/components/game/HowToPlay";
import type { GameProps } from "../../GameHost";
import { createCrossingScene, CROSSINGS_PER_ROUND } from "./CrossingScene";
import styles from "./Crossing.module.css";

const HOW_TO_MUL: HowTo = {
  goal: "Get the frog across the river to the far bank, four times.",
  controls: [
    "Tap a stone in the row just ahead to hop onto it.",
    "Or use the arrow keys: ↑ to hop, ← → to shuffle along.",
    "Tap the top bank once you reach the last row.",
  ],
  rules: [
    "Only stones that are multiples of the number in the banner will hold you.",
    "Step on a wrong one and you just float back to the start. Nothing is lost.",
    "There is no timer. Wait on the bank as long as you like.",
  ],
};

const HOW_TO_DIV: HowTo = {
  goal: "Get the frog across the river to the far bank, four times.",
  controls: [
    "Tap a stone in the row just ahead to hop onto it.",
    "Or use the arrow keys: ↑ to hop, ← → to shuffle along.",
    "Tap the top bank once you reach the last row.",
  ],
  rules: [
    "A stone holds you only if its number divides the banner number exactly.",
    "Step on a wrong one and you just float back to the start. Nothing is lost.",
    "There is no timer. Wait on the bank as long as you like.",
  ],
};

export default function Crossing({
  slug,
  topicId,
  name,
  variant,
  levels,
  initialLevel,
}: GameProps) {
  const kind = variant === "div" ? "div" : "mul";
  const [level, setLevel] = useState(initialLevel);
  const [crossings, setCrossings] = useState(0);
  const [sinks, setSinks] = useState(0);
  const [done, setDone] = useState(false);
  const busRef = useRef<GameBus | null>(null);

  const recorder = useAttemptRecorder({ gameSlug: slug, level });

  const onEvent = useCallback(
    (e: GameEvent) => {
      if (e.type === "attempt") {
        recorder.record(e);
        if (!(e.response as { ok: boolean }).ok) setSinks((n) => n + 1);
        return;
      }
      if (e.type === "round:complete") {
        const p = e.payload as { crossings: number; done: boolean };
        setCrossings(p.crossings);
        if (p.done) {
          busRef.current?.send({ type: "pause" });
          setDone(true);
          void recorder.flush();
        }
      }
    },
    [recorder],
  );

  const createScenes = useMemo(
    () => (P: typeof Phaser) => [createCrossingScene(P, { kind, level: initialLevel })],
    [kind, initialLevel],
  );

  const again = useCallback(() => {
    setCrossings(0);
    setSinks(0);
    setDone(false);
    busRef.current?.send({ type: "resume" });
    busRef.current?.send({ type: "level:set", level });
  }, [level]);

  const changeLevel = useCallback((next: number) => {
    setLevel(next);
    setCrossings(0);
    setSinks(0);
    setDone(false);
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
      instructions={
        kind === "mul"
          ? "Tap a stone ahead of you. Only multiples of the banner number will hold you up."
          : "Tap a stone ahead of you. Only numbers that divide the banner number will hold you up."
      }
      howTo={kind === "mul" ? HOW_TO_MUL : HOW_TO_DIV}
      status={
        <>
          <span className={styles.pip}>
            Crossings {crossings} / {CROSSINGS_PER_ROUND}
          </span>
          {sinks > 0 ? <span className={styles.soft}>{sinks} splashes</span> : null}
        </>
      }
    >
      <PhaserGame createScenes={createScenes} onEvent={onEvent} busRef={busRef} />
      {done ? (
        <div className={styles.overlay}>
          <div className={styles.panel}>
            <h2 className={styles.h2}>Across, four times.</h2>
            <p className={styles.sub}>
              {sinks === 0
                ? "Not one wrong stone the whole way."
                : `${sinks} splash${sinks === 1 ? "" : "es"} — every one of them free.`}
            </p>
            <button type="button" className="btn primary" onClick={again}>
              Cross again
            </button>
          </div>
        </div>
      ) : null}
    </GameChrome>
  );
}
