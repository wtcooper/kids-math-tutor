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
import { createGardenScene } from "./GardenScene";
import type { TowerSpec } from "./garden-model";
import styles from "./Garden.module.css";

const HOW_TO: HowTo = {
  goal: "Stop the number-gnomes before they reach the vegetables — by planting towers whose rules catch them.",
  controls: [
    "Read the wave preview, then press Send the wave.",
    "Tap a patch of turned earth to plant a tower there.",
    "Each tower only zaps numbers its rule matches.",
  ],
  rules: [
    "A 'multiples of 6' flower ignores a 35 completely — cover the wave, not the path.",
    "Stopped gnomes drop coins; towers cost coins.",
    "A gnome that gets through munches one vegetable. The round always finishes — nothing ends early.",
    "Planting pauses the garden. Think as long as you like.",
  ],
};

interface Live {
  phase: "ready" | "marching" | "picking" | "over";
  wave: number;
  waves: number;
  coins: number;
  veggies: number;
  stopped: number;
  leaked: number;
  preview: number[];
  pickingPlot: number;
  catalog: TowerSpec[];
  planted: { plot: number; label: string }[];
  canAfford: boolean;
}

interface Result {
  stopped: number;
  leaked: number;
  veggies: number;
  waves: number;
  towers: string[];
}

interface GardenSceneLike {
  plant(specId: string): void;
  cancelPlant(): void;
}
interface PhaserGameLike {
  scene: { getScene(key: string): unknown };
}

export default function Garden({ slug, topicId, name, concept, levels, initialLevel }: GameProps) {
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
    () => (P: typeof Phaser) => [createGardenScene(P, { level: initialLevel })],
    [initialLevel],
  );

  const scene = () => {
    const host = document.querySelector<HTMLElement & { __phaserGame?: PhaserGameLike }>(
      "[data-phaser-host]",
    );
    return host?.__phaserGame?.scene.getScene("garden") as GardenSceneLike | undefined;
  };

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
    if (!live) return { now: "Raking the beds…" };
    if (live.phase === "ready") {
      return {
        now: `Wave ${live.wave}: read the numbers coming, then plant what covers them.`,
        listTitle: "The wave",
        lines: live.preview.map((v) => ({ text: String(v), state: "current" as const })),
        hint: "Check a number against each tower: does 6 divide it? does it divide 48? is it prime? Every gnome needs at least one tower that matches it.",
      };
    }
    if (live.phase === "picking") {
      return {
        now: "Which rule covers the most of what is still coming?",
        listTitle: "Your towers so far",
        lines: live.planted.length
          ? live.planted.map((p) => ({ text: p.label, state: "done" as const }))
          : [{ text: "none yet", state: "todo" as const }],
        hint: "A primes flower and a multiples flower cover very different gnomes. Look for the numbers nothing you have planted would stop.",
      };
    }
    return {
      now: `Wave ${live.wave} of ${live.waves} marching — ${live.stopped} stopped, ${live.leaked} through.`,
      listTitle: "Your towers",
      lines: live.planted.map((p) => ({ text: p.label, state: "done" as const })),
      hint: "You can still plant mid-wave: tap a free patch of earth. The garden pauses while you choose.",
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
      instructions="Plant towers whose rules catch the numbers marching at your vegetables."
      howTo={HOW_TO}
      workings={workings}
      workingsKey={`${level}-${live?.wave ?? 0}-${live?.phase ?? ""}`}
      status={
        live ? (
          <>
            <span className={styles.coin}>{live.coins} coins</span>
            <span className={styles.pip}>
              wave {live.wave} / {live.waves}
            </span>
            <span className={styles.pip}>{live.veggies} veg left</span>
          </>
        ) : null
      }
    >
      <PhaserGame
        createScenes={createScenes}
        onEvent={onEvent}
        busRef={busRef}
        backgroundColor="#5E8C4A"
      />

      {/* Wave preview: the reading moment. It sits in normal flow ABOVE the canvas so
          not a single patch of earth is covered — planting before the wave is the whole
          strategy. Nothing marches until she sends it. */}
      {live?.phase === "ready" && !result ? (
        <div className={styles.previewBar}>
          <span className={styles.label}>Wave {live.wave} is forming</span>
          <div className={styles.numbers}>
            {live.preview.map((v, i) => (
              <span key={`${v}-${i}`} className={styles.number}>
                {v}
              </span>
            ))}
          </div>
          <button
            type="button"
            className="btn primary sm"
            onClick={() => busRef.current?.send({ type: "next" })}
          >
            Send the wave
          </button>
        </div>
      ) : null}

      {/* Tower picker for the tapped plot. The garden is paused underneath. */}
      {live?.phase === "picking" && !result ? (
        <div className={styles.scrim}>
          <div className={styles.card}>
            <p className={styles.label}>Plant what, here?</p>
            <div className={styles.towerRow}>
              {live.catalog.map((spec) => (
                <button
                  key={spec.id}
                  type="button"
                  className={`${styles.tower} ${styles[spec.kind]}`}
                  disabled={live.coins < spec.cost}
                  onClick={() => scene()?.plant(spec.id)}
                >
                  <span className={styles.towerName}>{spec.label}</span>
                  <span className={styles.towerCost}>{spec.cost} coins</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn ghost" onClick={() => scene()?.cancelPlant()}>
              Never mind
            </button>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className={styles.scrim}>
          <div className={`card ${styles.endPanel}`}>
            <h2 className={styles.h2}>
              {result.leaked === 0
                ? "Not one gnome got through."
                : `${result.stopped} stopped, ${result.leaked} got a bite.`}
            </h2>
            <p className={styles.sub}>
              {result.veggies} of 6 vegetables made it through {result.waves} waves.
              {result.towers.length
                ? ` Your garden: ${result.towers.join(", ")}.`
                : " You held them off with no towers at all?!"}
            </p>
            <div className={styles.actions}>
              <button type="button" className="btn primary" onClick={again}>
                New round
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
