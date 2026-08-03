"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type Phaser from "phaser";
import { PhaserGame, type GameBus, type GameEvent } from "@/components/game/PhaserGame";
import { GameChrome } from "@/components/game/GameChrome";
import { useAttemptRecorder } from "@/components/game/useAttemptRecorder";
import type { HowTo } from "@/components/game/HowToPlay";
import type { Workings } from "@/components/game/Workings";
import type { GameProps } from "../../GameHost";
import { createCrossingScene, CROSSINGS_PER_ROUND } from "./CrossingScene";
import styles from "./Crossing.module.css";

interface Live {
  kind: "mul" | "div";
  base: number;
  target: number | null;
  sequence: number[];
  step: number;
  onBank: boolean;
  crossings: number;
  done: boolean;
}

const HOW_TO_MUL: HowTo = {
  goal: "Get the frog across the river to the far bank, four times.",
  controls: [
    "Tap a stone in the row just ahead to hop onto it.",
    "Or use the arrow keys: ↑ to hop, ← → to shuffle along.",
    "Tap the top bank once you reach the last row.",
  ],
  rules: [
    "You must step the times table in order — 7, then 14, then 21, then 28.",
    "Other multiples are on the river too. 21 is a multiple of 7, but not if 14 comes next.",
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
    "You must step the factors in order, smallest first.",
    "Other factors are on the river too — the next one along is the only one that holds.",
    "Step on a wrong one and you just float back to the start. Nothing is lost.",
    "There is no timer. Wait on the bank as long as you like.",
  ],
};

export default function Crossing({
  slug,
  topicId,
  name, concept,
  variant,
  levels,
  initialLevel,
}: GameProps) {
  const kind = variant === "div" ? "div" : "mul";
  const [level, setLevel] = useState(initialLevel);
  const [crossings, setCrossings] = useState(0);
  const [sinks, setSinks] = useState(0);
  const [live, setLive] = useState<Live | null>(null);
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
      if (e.type === "state") {
        setLive(e.payload as Live);
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

  /**
   * The tutor's voice for the crossing: the step she is on, said as the multiplication
   * it actually is, with the ladder underneath.
   */
  const workings: Workings = useMemo(() => {
    if (!live) {
      return { now: "Getting the river ready…" };
    }
    const want = live.sequence[live.step];
    const prev = live.step > 0 ? live.sequence[live.step - 1] : null;

    const now =
      live.step >= live.sequence.length
        ? "Hop onto the far bank."
        : live.kind === "mul"
          ? prev === null
            ? `Find ${want}. That is ${live.base} × ${want / live.base}.`
            : `You are on ${prev}. Next is ${prev} + ${live.base} = ${want}.`
          : prev === null
            ? `Find ${want} — the smallest number that divides ${live.target}.`
            : `You are on ${prev}. Next is the smallest number above ${prev} that divides ${live.target} exactly.`;

    const lines = live.sequence.map((v, i) => ({
      text:
        live.kind === "mul"
          ? `${live.base} × ${v / live.base} = ${v}`
          : `${live.target} ÷ ${v} = ${(live.target ?? 0) / v}`,
      state: (i < live.step ? "done" : i === live.step ? "current" : "todo") as
        | "done"
        | "current"
        | "todo",
    }));

    const hint =
      live.kind === "mul"
        ? `Count on in ${live.base}s from where you are. Other multiples of ${live.base} are on the river to tempt you — only the next one along holds.`
        : `Try each number in turn: does it divide ${live.target} with nothing left over? The first one that does, above the one you are on, is the next stone.`;

    return {
      now,
      listTitle: live.kind === "mul" ? `The ${live.base}s` : `What divides ${live.target}`,
      lines,
      hint,
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
      instructions={
        kind === "mul"
          ? "Tap a stone ahead of you. Step the times table in order — only the next one holds."
          : "Tap a stone ahead of you. Step the factors in order — only the next one holds."
      }
      workings={workings}
      workingsKey={`${level}-${crossings}`}
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
      <PhaserGame
        createScenes={createScenes}
        onEvent={onEvent}
        busRef={busRef}
        backgroundColor="#173B47"
      />
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
