"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type Phaser from "phaser";
import { PhaserGame, type GameBus, type GameEvent } from "@/components/game/PhaserGame";
import { GameChrome } from "@/components/game/GameChrome";
import { useAttemptRecorder } from "@/components/game/useAttemptRecorder";
import type { HowTo } from "@/components/game/HowToPlay";
import { tutorHref } from "@/lib/topics";
import type { GameProps } from "../../GameHost";
import { createEnclosureScene } from "./EnclosureScene";
import styles from "./Enclosure.module.css";

const HOW_TO: HowTo = {
  goal: "Walk a fence around exactly the number of squares the sign asks for.",
  controls: [
    "Tap the next corner to walk there — one step at a time, along the lines.",
    "Arrow keys walk too. Backspace takes a step back.",
    "Walk back onto the red post to close the loop.",
  ],
  rules: [
    "Area is the squares inside. Fence is the edges you walked around them.",
    "Same area can cost very different amounts of fence — a long thin shape is expensive.",
    "Some jobs cap the fence, so you have to make the shape fatter.",
    "You can undo or start the fence over as often as you like. Nothing is timed.",
  ],
};

interface Live {
  wantArea: number;
  maxPerimeter?: number;
  area: number;
  fence: number;
  closed: boolean;
}

interface Result {
  wantArea: number;
  maxPerimeter: number | null;
  area: number;
  perimeter: number;
  areaOk: boolean;
  fenceOk: boolean;
  bestPossible: number;
}

export default function Enclosure({
  slug,
  topicId,
  name,
  levels,
  initialLevel,
}: GameProps) {
  const [level, setLevel] = useState(initialLevel);
  const [live, setLive] = useState<Live | null>(null);
  const [result, setResult] = useState<Result | null>(null);
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
        setResult(e.payload as Result);
        void recorder.flush();
      }
    },
    [recorder],
  );

  const createScenes = useMemo(
    () => (P: typeof Phaser) => [createEnclosureScene(P, { level: initialLevel })],
    [initialLevel],
  );

  const nextJob = useCallback(() => {
    setResult(null);
    busRef.current?.send({ type: "next" });
  }, []);

  const tryAgain = useCallback(() => {
    setResult(null);
    busRef.current?.send({ type: "reset" });
  }, []);

  const changeLevel = useCallback((next: number) => {
    setLevel(next);
    setResult(null);
    busRef.current?.send({ type: "level:set", level: next });
  }, []);

  const over =
    live?.maxPerimeter !== undefined && live.fence > live.maxPerimeter;

  return (
    <GameChrome
      slug={slug}
      title={name}
      topicId={topicId}
      levels={levels}
      level={level}
      onLevel={changeLevel}
      instructions="Walk the fence one corner at a time, then close the loop back on the red post."
      howTo={HOW_TO}
      status={
        live ? (
          <>
            <span className={styles.pip}>
              Wanted: {live.wantArea} squares
              {live.maxPerimeter !== undefined ? ` · fence ≤ ${live.maxPerimeter}` : ""}
            </span>
            <span className={`${styles.pip} ${over ? styles.over : ""}`}>
              Fence used {live.fence}
            </span>
            {live.closed ? (
              <span className={styles.pip}>Enclosed {live.area}</span>
            ) : null}
            <button type="button" className={styles.mini} onClick={() => busRef.current?.send({ type: "undo" })}>
              Step back
            </button>
            <button type="button" className={styles.mini} onClick={() => busRef.current?.send({ type: "reset" })}>
              Start the fence over
            </button>
          </>
        ) : null
      }
    >
      <PhaserGame createScenes={createScenes} onEvent={onEvent} busRef={busRef} />
      {result ? (
        <div className={styles.overlay}>
          <div className={`card ${styles.panel}`}>
            <h2 className={styles.h2}>
              {result.areaOk && result.fenceOk
                ? "That is the field."
                : result.areaOk
                  ? "Right size — too much fence."
                  : "Not quite that many squares."}
            </h2>

            <div className={styles.rows}>
              <div className={styles.row}>
                <span className={styles.k}>Area</span>
                <span className={result.areaOk ? styles.good : styles.bad}>
                  {result.area}
                </span>
                <span className={styles.want}>wanted {result.wantArea}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.k}>Perimeter</span>
                <span className={result.fenceOk ? styles.good : styles.bad}>
                  {result.perimeter}
                </span>
                <span className={styles.want}>
                  {result.maxPerimeter !== null
                    ? `limit ${result.maxPerimeter}`
                    : `tightest possible ${result.bestPossible}`}
                </span>
              </div>
            </div>

            <p className={styles.note}>
              {result.areaOk && result.fenceOk
                ? result.perimeter === result.bestPossible
                  ? "And that is the least fence this area can possibly take."
                  : `The tightest shape for ${result.wantArea} squares takes ${result.bestPossible} fence.`
                : result.areaOk
                  ? "Same squares, fatter shape. A long thin field costs far more fence than a squarer one."
                  : "Count the squares inside the loop — the fence is the edges around them, not the squares."}
            </p>

            <div className={styles.actions}>
              {result.areaOk && result.fenceOk ? (
                <button type="button" className="btn primary" onClick={nextJob}>
                  Next job
                </button>
              ) : (
                <button type="button" className="btn primary" onClick={tryAgain}>
                  Try that one again
                </button>
              )}
              <Link className="btn" href={tutorHref(topicId, { level })}>
                See this in the tutor
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </GameChrome>
  );
}
