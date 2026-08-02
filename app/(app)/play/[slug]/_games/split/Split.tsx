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
import { createSplitScene } from "./SplitScene";
import styles from "./Split.module.css";

const HOW_TO: HowTo = {
  goal: "Break every rock down until only primes are left floating.",
  controls: [
    "Move your finger or the mouse to slide the ship left and right.",
    "Tap to shoot straight up — line up under a rock first.",
    "Arrow keys work too: ← → to move, space to shoot.",
  ],
  rules: [
    "Shoot a rock and it splits into two numbers that multiply to make it.",
    "A prime cannot be split — the shot bounces off and it stays in your way.",
    "So the board fills up with the primes you made. That pile is the answer.",
    "No timer, and nothing can hurt you.",
  ],
};

interface Live {
  started: number[];
  left: number;
  primes: number[];
  splits: number;
}

interface Result {
  started: number[];
  primes: number[];
  splits: number;
  bounces: number;
}

/** n as a product of primes, the way the tutor writes it. */
function factorString(n: number): string {
  const out: number[] = [];
  let m = n;
  for (let d = 2; d * d <= m; d++) {
    while (m % d === 0) {
      out.push(d);
      m /= d;
    }
  }
  if (m > 1) out.push(m);
  return out.join(" × ");
}

export default function Split({
  slug,
  topicId,
  name, concept,
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
        busRef.current?.send({ type: "pause" });
        setResult(e.payload as Result);
        void recorder.flush();
      }
    },
    [recorder],
  );

  const createScenes = useMemo(
    () => (P: typeof Phaser) => [createSplitScene(P, { level: initialLevel })],
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
      concept={concept}
      title={name}
      topicId={topicId}
      levels={levels}
      level={level}
      onLevel={changeLevel}
      instructions="Shoot a rock to break it into two factors. Primes will not break — they just get in the way."
      howTo={HOW_TO}
      status={
        live ? (
          <>
            <span className={styles.pip}>{live.left} still to break</span>
            {live.primes.length > 0 ? (
              <span className={styles.primes}>
                primes so far: {live.primes.join(" · ")}
              </span>
            ) : null}
          </>
        ) : null
      }
    >
      <PhaserGame createScenes={createScenes} onEvent={onEvent} busRef={busRef} />
      {result ? (
        <div className={styles.overlay}>
          <div className={`card ${styles.panel}`}>
            <h2 className={styles.h2}>Nothing left but primes</h2>
            <p className={styles.sub}>
              That pile of rocks is the prime factorisation of what you started with.
            </p>
            <div className={styles.trees}>
              {result.started.map((n, i) => (
                <div key={`${n}-${i}`} className={styles.tree}>
                  <span className={styles.from}>{n}</span>
                  <span className={styles.eq}>=</span>
                  <span className={styles.to}>{factorString(n)}</span>
                </div>
              ))}
            </div>
            <p className={styles.foot}>
              {result.splits} split{result.splits === 1 ? "" : "s"}
              {result.bounces > 0
                ? ` · ${result.bounces} shot${result.bounces === 1 ? "" : "s"} bounced off a prime`
                : " · not one wasted shot"}
            </p>
            <div className={styles.actions}>
              <button type="button" className="btn primary" onClick={again}>
                New rocks
              </button>
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
