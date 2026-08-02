"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { GameChrome } from "@/components/game/GameChrome";
import { useAttemptRecorder } from "@/components/game/useAttemptRecorder";
import type { HowTo } from "@/components/game/HowToPlay";
import type { Workings } from "@/components/game/Workings";
import { makeRng, mulberry32 } from "@/lib/math/rng";
import { tutorHref } from "@/lib/topics";
import type { GameProps } from "../../GameHost";
import {
  fillsExactly,
  genCut,
  piecesNeeded,
  simplify,
  workableDenoms,
} from "./cut-model";
import styles from "./Cut.module.css";

/**
 * Cut — equivalent fractions by slicing.
 *
 * A gap in a wall is 3/4 of a brick wide. Slice a brick into quarters and three fit;
 * slice it into eighths and six fit — *the same width of wall*. That is what equivalence
 * is, and it is visible rather than asserted.
 *
 * No timer, no wrong-answer penalty. A piece that does not fit simply overshoots the gap,
 * which she can see.
 */

const HOW_TO: HowTo = {
  goal: "Fill the gap in the wall exactly, using pieces that are all the same size.",
  controls: [
    "Use the knife buttons to slice the brick into more pieces.",
    "Tap the gap to lay one piece in, or tap a laid piece to take it back.",
  ],
  rules: [
    "Every piece you lay must be the same size — that is what the bottom number means.",
    "Fill it exactly. Sticking out past the gap does not count.",
    "Several different slicings will work. They are all the same width of wall.",
    "Nothing is timed and nothing is lost by trying.",
  ],
};

const BAR_W = 640;
const BAR_H = 58;

export default function Cut({ slug, topicId, name, concept, levels, initialLevel, seed }: GameProps) {
  const [level, setLevel] = useState(initialLevel);
  const [nonce, setNonce] = useState(0);
  const recorder = useAttemptRecorder({ gameSlug: slug, level });

  const problem = useMemo(() => {
    const rng = makeRng(mulberry32(seed + nonce * 7919 + level * 313));
    return genCut(level, (a, b) => rng.int(a, b));
  }, [level, nonce, seed]);

  const { gap, reachable } = problem;
  const [denom, setDenom] = useState(1);
  const [laid, setLaid] = useState(0);
  const [done, setDone] = useState(false);

  const reset = useCallback(() => {
    setDenom(1);
    setLaid(0);
    setDone(false);
  }, []);

  const newProblem = useCallback(() => {
    setNonce((n) => n + 1);
    reset();
  }, [reset]);

  const changeLevel = useCallback(
    (next: number) => {
      setLevel(next);
      setNonce((n) => n + 1);
      reset();
    },
    [reset],
  );

  /** Slicing changes the piece size, so whatever was laid no longer applies. */
  const slice = useCallback((by: number) => {
    setDenom((d) => Math.min(48, d * by));
    setLaid(0);
  }, []);

  const gapWidth = (gap.n / gap.d) * BAR_W;
  const pieceWidth = BAR_W / denom;
  const laidWidth = laid * pieceWidth;
  const overshoot = laidWidth > gapWidth + 0.001;

  const addPiece = useCallback(() => {
    if (done) return;
    setLaid((prev) => {
      const next = prev + 1;
      if (fillsExactly(gap, denom, next)) {
        recorder.record({
          type: "attempt",
          prompt: { gapN: gap.n, gapD: gap.d },
          response: { denom, pieces: next, ok: true },
          elapsedMs: 0,
        });
        void recorder.flush();
        setDone(true);
      }
      return next;
    });
  }, [done, gap, denom, recorder]);

  const optionsForPanel = workableDenoms(gap, reachable);
  const needAtDenom = piecesNeeded(gap, denom);

  const workings: Workings = useMemo(() => ({
    now: done
      ? "Filled exactly."
      : denom === 1
        ? `The gap is ${gap.n}/${gap.d} of a brick. Slice the brick until the pieces are small enough to fit it.`
        : needAtDenom === null
          ? `Pieces of 1/${denom} will never land on the line. ${gap.d} does not divide into ${denom} evenly — try slicing a different way.`
          : `Each piece is 1/${denom}. How many make ${gap.n}/${gap.d}? That is ${gap.n} × ${denom} ÷ ${gap.d}.`,
    listTitle: "Slicings that fit exactly",
    lines: optionsForPanel.slice(0, 5).map((d) => ({
      text: `${piecesNeeded(gap, d)} pieces of 1/${d}  =  ${gap.n}/${gap.d}`,
      state: (d === denom ? "current" : "todo") as "current" | "todo",
    })),
    hint: `A slicing only works if ${gap.d} divides into it. Halving and thirding from a whole brick gets you to ${optionsForPanel.slice(0, 3).join(", ")} — all the same width of wall.`,
  }), [done, denom, gap, needAtDenom, optionsForPanel]);

  const options = workableDenoms(gap, reachable);
  const simplest = options[0];
  const [sn, sd] = simplify(gap.n, gap.d);
  const usedPieces = piecesNeeded(gap, denom);

  return (
    <GameChrome
      slug={slug}
      concept={concept}
      title={name}
      topicId={topicId}
      levels={levels}
      level={level}
      onLevel={changeLevel}
      instructions="Slice the brick, then lay pieces into the gap until it is filled exactly."
      howTo={HOW_TO}
      workings={workings}
      workingsKey={`${level}-${nonce}`}
      status={
        <>
          <span className={styles.pip}>
            Gap: {gap.n}/{gap.d} of a brick
          </span>
          <span className={styles.pip}>
            Pieces are {denom === 1 ? "whole bricks" : `1/${denom}`}
          </span>
          <span className={overshoot ? styles.over : styles.soft}>
            {laid} laid{overshoot ? " — past the edge" : ""}
          </span>
          <button type="button" className={styles.mini} onClick={reset}>
            Start over
          </button>
        </>
      }
    >
      <div className={styles.stage}>
        <div className={styles.tools}>
          <span className={styles.toolLabel}>Knife</span>
          <button type="button" className={styles.tool} onClick={() => slice(2)} disabled={done}>
            Halve each piece
          </button>
          <button type="button" className={styles.tool} onClick={() => slice(3)} disabled={done}>
            Cut each into 3
          </button>
          <button
            type="button"
            className={styles.tool}
            onClick={() => {
              setDenom(1);
              setLaid(0);
            }}
            disabled={done}
          >
            Fresh brick
          </button>
        </div>

        <svg
          className={styles.wall}
          viewBox={`0 0 ${BAR_W} ${BAR_H * 3 + 46}`}
          role="img"
          aria-label={`A gap ${gap.n} of ${gap.d} bricks wide`}
        >
          {/* The wall, with the gap in it. */}
          <text x={0} y={14} className={styles.cap}>
            The gap
          </text>
          <rect x={0} y={22} width={BAR_W} height={BAR_H} rx={5} fill="#efe7db" />
          <rect x={0} y={22} width={gapWidth} height={BAR_H} rx={5} fill="#fffcf7" stroke="#c9b79b" strokeDasharray="5 4" />
          {/* Pieces laid into the gap. */}
          {Array.from({ length: laid }, (_, i) => (
            <rect
              key={i}
              x={i * pieceWidth + 1}
              y={23}
              width={pieceWidth - 2}
              height={BAR_H - 2}
              rx={3}
              fill={i * pieceWidth + pieceWidth > gapWidth + 0.001 ? "#f2dade" : "#dce7d6"}
              stroke={i * pieceWidth + pieceWidth > gapWidth + 0.001 ? "#c98d95" : "#8aa683"}
            />
          ))}
          <line x1={gapWidth} y1={16} x2={gapWidth} y2={22 + BAR_H + 6} stroke="#be6e4e" strokeWidth={2} />

          {/* The brick you are cutting from. */}
          <text x={0} y={BAR_H + 52} className={styles.cap}>
            Your brick, cut into {denom}
          </text>
          <g transform={`translate(0 ${BAR_H + 60})`}>
            <rect x={0} y={0} width={BAR_W} height={BAR_H} rx={5} fill="#fdf6e9" stroke="#d8c8ac" />
            {Array.from({ length: denom - 1 }, (_, i) => (
              <line
                key={i}
                x1={(i + 1) * pieceWidth}
                y1={0}
                x2={(i + 1) * pieceWidth}
                y2={BAR_H}
                stroke="#d8c8ac"
              />
            ))}
          </g>

          <rect
            x={0}
            y={0}
            width={BAR_W}
            height={BAR_H + 30}
            fill="transparent"
            onClick={addPiece}
            className={styles.hit}
          />
        </svg>

        <div className={styles.actions}>
          <button type="button" className="btn primary" onClick={addPiece} disabled={done}>
            Lay a piece
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setLaid((n) => Math.max(0, n - 1))}
            disabled={done || laid === 0}
          >
            Take one back
          </button>
        </div>

        {done ? (
          <div className={styles.overlay}>
            <div className={`card ${styles.panel}`}>
              <h2 className={styles.h2}>Exactly.</h2>
              <p className={styles.sub}>
                {laid} piece{laid === 1 ? "" : "s"} of {denom === 1 ? "a whole brick" : `1/${denom}`}{" "}
                fills the same gap as {gap.n}/{gap.d}.
              </p>

              <div className={styles.eqLine}>
                <span className={styles.frac}>
                  <span>{gap.n}</span>
                  <span className={styles.bar} />
                  <span>{gap.d}</span>
                </span>
                <span className={styles.eq}>=</span>
                <span className={`${styles.frac} ${styles.hi}`}>
                  <span>{laid}</span>
                  <span className={styles.bar} />
                  <span>{denom}</span>
                </span>
              </div>

              <p className={styles.note}>
                {denom === sd
                  ? `That is as few pieces as this gap can be filled with — ${sn}/${sd} is in lowest terms.`
                  : `The fewest pieces that would do it is ${piecesNeeded(gap, simplest)} of 1/${simplest}. Same wall, bigger pieces.`}
              </p>

              <div className={styles.actions}>
                <button type="button" className="btn primary" onClick={newProblem}>
                  Another gap
                </button>
                <Link className="btn" href={tutorHref(topicId, { level })}>
                  See this in the tutor
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {!done && usedPieces === null && laid > 0 ? (
          <p className={styles.hint}>
            Pieces this size will never land exactly on the line — try slicing differently.
          </p>
        ) : null}
      </div>
    </GameChrome>
  );
}
