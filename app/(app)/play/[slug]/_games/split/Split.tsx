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
import { createSplitScene } from "./SplitScene";
import styles from "./Split.module.css";

/** Just enough of the scene's shape to answer the break question from React. */
interface SplitSceneLike {
  answerBreak(count: number, size: number): void;
  cancelSplit(): void;
}
interface PhaserGameLike {
  scene: { getScene(key: string): unknown };
}

const HOW_TO: HowTo = {
  goal: "Break every rock down until only primes are left floating.",
  controls: [
    "Move your finger or the mouse and the ship follows underneath.",
    "Tap or click to shoot straight up from where the ship is.",
    "Then say how it shatters — into equal rocks, like three 4s from a 12.",
    "Keyboard: hold ← → to fly, space to shoot.",
  ],
  rules: [
    "A rock always breaks into equal pieces: 12 can be two 6s, three 4s, four 3s or six 2s.",
    "A prime cannot be split — the shot bounces off and it stays in your way.",
    "So the board fills up with the primes you made. That pile is the answer.",
    "No timer, and nothing can hurt you.",
  ],
};

interface Live {
  /** The rock she has shot and must break, or null when flying. */
  asking: number | null;
  /** Every equal break of the asked rock: (how many, of what). */
  breaks: [number, number][];
  started: number[];
  left: number;
  primes: number[];
  splits: number;
}

/** "two 6s", "three 4s", "24 twos" — the way you would say it out loud. */
const COUNT_WORDS = [
  "", "", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve",
];
function breakLabel(count: number, size: number): string {
  const word = COUNT_WORDS[count] ?? String(count);
  return `${word} ${size}s`;
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
  const [guess, setGuess] = useState("");
  const [wrong, setWrong] = useState(false);
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
        const next = e.payload as Live;
        setLive(next);
        if (!next.asking) {
          setGuess("");
          setWrong(false);
        }
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

  /** Reach the running scene to answer the factor question. */
  const scene = () => {
    const host = document.querySelector<HTMLElement & { __phaserGame?: PhaserGameLike }>(
      "[data-phaser-host]",
    );
    return host?.__phaserGame?.scene.getScene("split") as SplitSceneLike | undefined;
  };

  const submitBreak = useCallback(
    (count: number, size: number) => {
      const s = scene();
      if (!s) return;
      if (count * size !== (live?.asking ?? 0)) {
        setWrong(true);
        return;
      }
      setWrong(false);
      setGuess("");
      s.answerBreak(count, size);
    },
    [live],
  );

  const workings: Workings = useMemo(() => {
    if (!live) return { now: "Getting the rocks ready…" };
    if (live.asking) {
      return {
        now: `How many equal rocks can ${live.asking} shatter into?`,
        listTitle: "Try sharing it out",
        lines: [2, 3, 4, 5, 6]
          .filter((d) => d * 2 <= live.asking!)
          .map((d) => ({
            text:
              live.asking! % d === 0
                ? `${live.asking} ÷ ${d} = ${live.asking! / d} → ${breakLabel(d, live.asking! / d)}`
                : `${live.asking} ÷ ${d} = not exact`,
            state: (live.asking! % d === 0 ? "current" : "todo") as "current" | "todo",
          })),
        hint: `Share ${live.asking} into 2, then 3, then 4… equal piles. Every share that comes out exact is a real break — and every one ends at the same primes.`,
      };
    }
    return {
      now:
        live.left > 0
          ? "Line up under a rock and shoot it. Only the ones that are not prime will break."
          : "Nothing left but primes.",
      listTitle: live.primes.length ? "Primes on the board" : undefined,
      lines: live.primes.map((p) => ({ text: String(p), state: "done" as const })),
      hint: "A prime has no factors except 1 and itself, so shooting it does nothing but leave it in your way.",
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
      instructions="Line up under a rock and shoot, then say how it shatters — into equal rocks."
      howTo={HOW_TO}
      workings={workings}
      workingsKey={live?.asking ?? "flying"}
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
      <PhaserGame
        createScenes={createScenes}
        onEvent={onEvent}
        busRef={busRef}
        backgroundColor="#101426"
      />

      {live?.asking ? (
        <div className={styles.askScrim}>
          <div className={`card ${styles.ask}`}>
            <p className={styles.askQ}>
              <strong>{live.asking}</strong> shatters into…
            </p>
            <div className={styles.pairs}>
              {live.breaks.map(([count, size]) => (
                <button
                  key={`${count}x${size}`}
                  type="button"
                  className={styles.pair}
                  onClick={() => submitBreak(count, size)}
                >
                  <span className={styles.pairWords}>{breakLabel(count, size)}</span>
                  <span className={styles.pairMath}>
                    {count} × {size} = {live.asking}
                  </span>
                </button>
              ))}
            </div>
            <div className={styles.typeRow}>
              <span className={styles.typeLabel}>or type how many pieces</span>
              <input
                className={styles.typed}
                inputMode="numeric"
                value={guess}
                placeholder="?"
                aria-label={`How many equal pieces to break ${live.asking} into`}
                onChange={(e) => {
                  setGuess(e.target.value.replace(/[^\d]/g, "").slice(0, 4));
                  setWrong(false);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const k = Number(guess);
                  if (!k || k < 2 || live.asking! % k !== 0 || live.asking! / k < 2) {
                    setWrong(true);
                    return;
                  }
                  submitBreak(k, live.asking! / k);
                }}
              />
              {guess &&
              Number(guess) >= 2 &&
              live.asking % Number(guess) === 0 &&
              live.asking / Number(guess) >= 2 ? (
                <span className={styles.other}>
                  → {breakLabel(Number(guess), live.asking / Number(guess))}
                </span>
              ) : null}
            </div>
            {wrong ? (
              <p className={styles.askWrong}>
                {live.asking} does not share into that many equal whole pieces — and
                pieces of 1 don&apos;t count.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {result ? (
        <div className={styles.overlay}>
          <div className={`card ${styles.panel}`}>
            <h2 className={styles.h2}>Nothing left but primes</h2>
            <p className={styles.sub}>
              Every rock is prime now — nothing left will share into equal pieces.
              Written the tutor&apos;s way, the breaks you chose are these factors:
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
