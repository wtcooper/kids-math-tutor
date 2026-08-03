"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type Phaser from "phaser";
import { PhaserGame, type GameBus, type GameEvent } from "@/components/game/PhaserGame";
import { GameChrome } from "@/components/game/GameChrome";
import { useAttemptRecorder } from "@/components/game/useAttemptRecorder";
import type { HowTo } from "@/components/game/HowToPlay";
import type { Workings } from "@/components/game/Workings";
import type { GameProps } from "../../GameHost";
import { createDepthsScene } from "./DepthsScene";
import type { ChestSpec, DoorSpec } from "./depths-model";
import styles from "./Depths.module.css";

const HOW_TO: HowTo = {
  goal: "Explore the mine, floor by floor. Everything down here answers to a number.",
  controls: [
    "Walk with the arrow keys or WASD — or tap where you want to go.",
    "Walk up to a beetle, a door or a chest and it will put its question to you.",
  ],
  rules: [
    "Beetles carry shield-numbers. Strike with a number that DIVIDES the shell; when the core is prime, it shatters and pays out.",
    "A strike that doesn't divide just bounces. Backing out of any fight is allowed.",
    "Doors want shares, locks want x. Chests pay products.",
    "Your floor, coins and shells shattered are saved — the mine remembers you.",
  ],
};

interface Engaged {
  kind: "monster" | "door" | "chest";
  shell: number | null;
  strikes: string[];
  door: DoorSpec | null;
  chest: ChestSpec | null;
}

interface Live {
  floor: number;
  coins: number;
  xp: number;
  beaten: number;
  engaged: Engaged | null;
  monstersLeft: number;
  doorsOpen: number;
}

interface Result {
  clearedFloor: number;
  nextFloor: number;
  coins: number;
  floorCoins: number;
  xp: number;
  beaten: number;
}

interface DepthsSceneLike {
  strikeMonster(d: number): void;
  answerDoor(v: number): void;
  answerChest(v: number): void;
  disengage(): void;
}
interface PhaserGameLike {
  scene: { getScene(key: string): unknown };
}

export default function Depths({ slug, topicId, name, concept, levels, initialLevel }: GameProps) {
  const [level, setLevel] = useState(initialLevel);
  const [live, setLive] = useState<Live | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [typed, setTyped] = useState("");
  const busRef = useRef<GameBus | null>(null);
  const recorder = useAttemptRecorder({ gameSlug: slug, level });

  const onEvent = useCallback(
    (e: GameEvent) => {
      if (e.type === "attempt") {
        recorder.record(e);
        return;
      }
      if (e.type === "state") {
        const next = e.payload as Live;
        setLive(next);
        if (!next.engaged) setTyped("");
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
    () => (P: typeof Phaser) => [createDepthsScene(P, { level: initialLevel })],
    [initialLevel],
  );

  const scene = () => {
    const host = document.querySelector<HTMLElement & { __phaserGame?: PhaserGameLike }>(
      "[data-phaser-host]",
    );
    return host?.__phaserGame?.scene.getScene("depths") as DepthsSceneLike | undefined;
  };

  const descend = useCallback(() => {
    setResult(null);
    busRef.current?.send({ type: "resume" });
    busRef.current?.send({ type: "next" });
  }, []);

  const submit = useCallback(() => {
    const v = Number(typed);
    if (!typed || !Number.isFinite(v)) return;
    const s = scene();
    if (!s || !live?.engaged) return;
    setTyped("");
    if (live.engaged.kind === "monster") s.strikeMonster(v);
    else if (live.engaged.kind === "door") s.answerDoor(v);
    else s.answerChest(v);
  }, [typed, live]);

  const workings: Workings = useMemo(() => {
    if (!live) return { now: "Lighting the lantern…" };
    const e = live.engaged;
    if (e?.kind === "monster" && e.shell) {
      return {
        now: `The shell is ${e.shell}. Strike with anything that divides it.`,
        listTitle: "Try the small primes first",
        lines: [2, 3, 5, 7].map((d) => ({
          text: `${e.shell} ÷ ${d} ${e.shell! % d === 0 ? "goes exactly" : "= not exact"}`,
          state: (e.shell! % d === 0 ? "current" : "todo") as "current" | "todo",
        })),
        hint: "Any factor works — big strikes split faster. When what's left is prime, the shell shatters and pays its core in coins.",
      };
    }
    if (e?.kind === "door" && e.door) {
      return {
        now: e.door.text,
        hint:
          e.door.kind === "share"
            ? `Share ${e.door.total} into ${e.door.bags} equal bags: ${e.door.total} ÷ ${e.door.bags}.`
            : `What number plus ${e.door.a} makes ${e.door.b}? Take ${e.door.a} from both sides.`,
      };
    }
    if (e?.kind === "chest" && e.chest) {
      return {
        now: e.chest.text,
        hint: `${e.chest.pouches} groups of ${e.chest.each}: multiply.`,
      };
    }
    return {
      now:
        live.monstersLeft > 0
          ? `Floor ${live.floor}. ${live.monstersLeft} beetle${live.monstersLeft === 1 ? "" : "s"} still carrying shells — and the way down is behind ${3 - live.doorsOpen} sealed door${3 - live.doorsOpen === 1 ? "" : "s"}.`
          : `Floor ${live.floor} is quiet. Find the ladder down.`,
      hint: "Walk up to anything with a number and it will ask you its question. Nothing down here can hurt you.",
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
      onLevel={setLevel}
      instructions="Walk the mine. Strike shells with divisors, feed the doors, open the way down."
      howTo={HOW_TO}
      workings={workings}
      workingsKey={`${live?.floor}-${live?.engaged?.kind ?? "walking"}`}
      status={
        live ? (
          <>
            <span className={styles.floorPip}>floor {live.floor}</span>
            <span className={styles.coin}>{live.coins} coins</span>
            <span className={styles.pip}>{live.beaten} shells shattered</span>
          </>
        ) : null
      }
    >
      <PhaserGame
        createScenes={createScenes}
        onEvent={onEvent}
        busRef={busRef}
        backgroundColor="#241B14"
      />

      {live?.engaged && !result ? (
        <div className={styles.scrim}>
          <div className={styles.card}>
            {live.engaged.kind === "monster" ? (
              <>
                <p className={styles.label}>A shield-beetle blocks the way</p>
                <p className={styles.big}>
                  Its shell is <strong>{live.engaged.shell}</strong> — strike with a
                  number that divides it
                </p>
              </>
            ) : live.engaged.kind === "door" ? (
              <>
                <p className={styles.label}>A rune door</p>
                <p className={styles.big}>{live.engaged.door?.text}</p>
              </>
            ) : (
              <>
                <p className={styles.label}>A chest!</p>
                <p className={styles.big}>{live.engaged.chest?.text}</p>
              </>
            )}
            <div className={styles.inputRow}>
              <input
                className={styles.input}
                inputMode="numeric"
                autoFocus
                value={typed}
                placeholder="?"
                aria-label="Your number"
                onChange={(ev) => setTyped(ev.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") submit();
                }}
              />
              <button type="button" className="btn primary" onClick={submit}>
                {live.engaged.kind === "monster" ? "Strike" : "Answer"}
              </button>
              <button type="button" className="btn ghost" onClick={() => scene()?.disengage()}>
                Back away
              </button>
            </div>
            {live.engaged.strikes.length ? (
              <ul className={styles.log}>
                {live.engaged.strikes.slice(-4).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      {result ? (
        <div className={styles.scrim}>
          <div className={`card ${styles.endPanel}`}>
            <h2 className={styles.h2}>Floor {result.clearedFloor} cleared.</h2>
            <p className={styles.sub}>
              {result.floorCoins} coins hauled up from this floor — {result.coins} in the
              bank, {result.beaten} shells shattered all time. The mine only gets richer
              further down.
            </p>
            <div className={styles.actions}>
              <button type="button" className="btn primary" onClick={descend}>
                Descend to floor {result.nextFloor}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </GameChrome>
  );
}
