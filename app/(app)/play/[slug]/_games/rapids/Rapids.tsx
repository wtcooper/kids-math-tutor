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
import { createRapidsScene, GATES_PER_RUN } from "./RapidsScene";
import { type Gate, RAPIDS_LEVELS } from "./rapids-model";
import styles from "./Rapids.module.css";

const HOW_TO: HowTo = {
  goal: "Steer the raft through twelve gates — always through the opening the banner asks for.",
  controls: [
    "Move the mouse or your finger and the raft follows.",
    "Or hold ← → to paddle.",
  ],
  rules: [
    "The river never stops, but no single gate is ever timed.",
    "The wrong opening just spins you — free — and the river slows while you recover.",
    "Counting levels want the NEXT number in the table; fraction levels want the bigger one, or the equal one.",
    "Clean gates make the river run a little quicker. Spins calm it down.",
  ],
};

interface Live {
  kind: string;
  prompt: string;
  gate: Gate | null;
  passed: number;
  spins: number;
  streak: number;
  distance: number;
  total: number;
}

interface Result {
  passed: number;
  spins: number;
  total: number;
  distance: number;
  kind: string;
}

export default function Rapids({ slug, topicId, name, concept, levels, initialLevel }: GameProps) {
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
    () => (P: typeof Phaser) => [createRapidsScene(P, { level: initialLevel })],
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
    if (!live?.gate) return { now: "The river is gathering…" };
    const m = live.gate.meta as Record<string, unknown>;
    if (live.kind === "count-easy" || live.kind === "count-hard") {
      const base = m.base as number;
      const from = m.from as number;
      return {
        now: `${live.prompt}`,
        listTitle: `The ${base}s from here`,
        lines: [1, 2, 3].map((step) => ({
          text: `${from} + ${base * step === base ? base : `${base} × ${step}`} … ${from + base * step}`,
          state: (step === 1 ? "current" : "todo") as "current" | "todo",
        })),
        hint: `You are on ${from}. One more ${base} lands on ${from + base} — that is the opening that holds.`,
      };
    }
    if (live.kind === "frac-compare") {
      const [a, b] = live.gate.sides;
      const [an, ad] = a.split("/").map(Number);
      const [bn, bd] = b.split("/").map(Number);
      return {
        now: "Which is bigger? Cross-multiply — no guessing from shapes.",
        listTitle: "Cross it",
        lines: [
          { text: `${a}: ${an} × ${bd} = ${an * bd}`, state: "current" },
          { text: `${b}: ${bn} × ${ad} = ${bn * ad}`, state: "current" },
          {
            text: `${an * bd > bn * ad ? a : b} is the bigger one`,
            state: "todo",
          },
        ],
        hint: "Multiply each top by the other bottom. The bigger product marks the bigger fraction.",
      };
    }
    const target = m.target as string;
    return {
      now: `${live.prompt}`,
      listTitle: "Check an opening",
      lines: live.gate.sides.map((s) => {
        const [n, d] = s.split("/").map(Number);
        const [tn, td] = target.split("/").map(Number);
        return {
          text: `${s}: ${n} × ${td} = ${n * td} vs ${tn} × ${d} = ${tn * d} — ${n * td === tn * d ? "equal" : "not equal"}`,
          state: "current" as const,
        };
      }),
      hint: `Two fractions are equal when the cross-products match. Only one opening crosses even with ${target}.`,
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
      instructions="Steer through the opening the banner asks for. The river never stops."
      howTo={HOW_TO}
      workings={workings}
      workingsKey={`${level}-${live?.passed ?? 0}-${live?.spins ?? 0}`}
      status={
        live ? (
          <>
            <span className={styles.pip}>
              gate {Math.min(live.total, live.passed + live.spins + 1)} of {live.total}
            </span>
            <span className={styles.good}>{live.passed} clean</span>
            {live.streak >= 3 ? <span className={styles.streak}>streak {live.streak}!</span> : null}
            <span className={styles.soft}>{live.distance} m</span>
          </>
        ) : null
      }
    >
      <PhaserGame
        createScenes={createScenes}
        onEvent={onEvent}
        busRef={busRef}
        backgroundColor="#173B47"
      />
      {result ? (
        <div className={styles.overlay}>
          <div className={`card ${styles.panel}`}>
            <h2 className={styles.h2}>
              {result.passed === result.total
                ? "A clean run!"
                : `${result.passed} of ${result.total} gates, clean.`}
            </h2>
            <p className={styles.sub}>
              {result.distance} metres of river
              {result.spins > 0
                ? ` · ${result.spins} spin${result.spins === 1 ? "" : "s"} — every one free.`
                : " · and the raft never spun once."}
            </p>
            <div className={styles.actions}>
              <button type="button" className="btn primary" onClick={again}>
                Run it again
              </button>
              <Link className="btn" href={tutorHref(topicId, { level: 1 })}>
                See this in the tutor
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </GameChrome>
  );
}

export { GATES_PER_RUN, RAPIDS_LEVELS };
