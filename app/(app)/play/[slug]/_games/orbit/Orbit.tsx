"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type Phaser from "phaser";
import { PhaserGame, type GameBus, type GameEvent } from "@/components/game/PhaserGame";
import { GameChrome } from "@/components/game/GameChrome";
import { useAttemptRecorder } from "@/components/game/useAttemptRecorder";
import type { HowTo } from "@/components/game/HowToPlay";
import type { Workings } from "@/components/game/Workings";
import { tutorHref } from "@/lib/topics";
import type { GameProps } from "../../GameHost";
import { AMMO, createOrbitScene } from "./OrbitScene";
import styles from "./Orbit.module.css";

const HOW_TO: HowTo = {
  goal: "Strip every rock down to primes — by firing the right prime at it.",
  controls: [
    "Move the mouse or your finger and the ship follows.",
    "Tap the rack (or press 1–6) to load a prime shell.",
    "Tap anywhere else, or space, to fire.",
  ],
  rules: [
    "A shell only splits a rock its prime divides — 3 splits 51, nothing else will.",
    "A wrong shell just glances off. Free, always.",
    "Rocks that are already prime cannot break; fly around them.",
    "No timer. The only pressure is the rocks you make.",
  ],
};

interface Live {
  loaded: number;
  started: number[];
  left: number;
  composites: number[];
  primes: number[];
  splits: number;
  bounces: number;
}

interface Result {
  started: number[];
  primes: number[];
  splits: number;
  bounces: number;
}

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

/** The divisibility tells, narrated for the rock she should be sizing up. */
function tells(n: number): { text: string; state: "current" | "todo" | "done" }[] {
  const digitSum = String(n)
    .split("")
    .reduce((a, c) => a + Number(c), 0);
  return [
    {
      text: `2: is ${n} even? ${n % 2 === 0 ? "yes — 2 works" : "no"}`,
      state: n % 2 === 0 ? "current" : "todo",
    },
    {
      text: `3: digits add to ${digitSum} — ${digitSum % 3 === 0 ? `3 goes in` : `3 does not`}`,
      state: n % 3 === 0 ? "current" : "todo",
    },
    {
      text: `5: ends in ${n % 10} — ${n % 5 === 0 ? "5 goes in" : "5 does not"}`,
      state: n % 5 === 0 ? "current" : "todo",
    },
    {
      text: `7 and up: just try them — a miss is free`,
      state: "todo",
    },
  ];
}

export default function Orbit({ slug, topicId, name, concept, levels, initialLevel }: GameProps) {
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
    () => (P: typeof Phaser) => [createOrbitScene(P, { level: initialLevel })],
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

  const workings: Workings = useMemo(() => {
    if (!live) return { now: "Loading the rack…" };
    const target = live.composites[0];
    if (target === undefined) {
      return {
        now: "Nothing left but primes.",
        lines: live.primes.map((p) => ({ text: String(p), state: "done" as const })),
      };
    }
    return {
      now: `Size up the ${target}: which prime on the rack divides it?`,
      listTitle: `The tells for ${target}`,
      lines: tells(target),
      hint: `You have ${AMMO.join(", ")} on the rack. Only a prime that divides the rock will split it — everything else glances off for free, so trying IS finding out.`,
    };
  }, [live]);

  return (
    <GameChrome
      slug={slug}
      concept={concept}
      title={name}
      topicId={topicId}
      levels={levels}
      level={level}
      onLevel={changeLevel}
      instructions="Load a prime, line up, fire — a shell only splits a rock its prime divides."
      howTo={HOW_TO}
      workings={workings}
      workingsKey={`${level}-${live?.composites?.[0] ?? "none"}`}
      status={
        live ? (
          <>
            <span className={styles.pip}>loaded: {live.loaded}</span>
            <span className={styles.pip}>{live.left} still to break</span>
            {live.bounces > 0 ? (
              <span className={styles.soft}>{live.bounces} glanced off</span>
            ) : null}
          </>
        ) : null
      }
    >
      <PhaserGame
        createScenes={createScenes}
        onEvent={onEvent}
        busRef={busRef}
        backgroundColor="#101426"
      />
      {result ? (
        <div className={styles.overlay}>
          <div className={`card ${styles.panel}`}>
            <h2 className={styles.h2}>Stripped to primes.</h2>
            <p className={styles.sub}>
              Every prime you fired came out of the rock it split — that is the whole
              factorisation, extracted shot by shot.
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
              {result.splits} clean split{result.splits === 1 ? "" : "s"}
              {result.bounces > 0
                ? ` · ${result.bounces} shell${result.bounces === 1 ? "" : "s"} glanced off`
                : " · every shell found its mark"}
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
