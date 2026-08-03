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
          viewBox={`0 0 ${BAR_W} ${BAR_H * 3 + 110}`}
          role="img"
          aria-label={`A gap ${gap.n} of ${gap.d} bricks wide`}
        >
          {/* A real wall: a course of bricks above and below, the gap in the middle
              course. The fiction is drawn, not captioned. */}
          <text x={0} y={14} className={styles.cap}>
            The gap
          </text>
          {[0, 1].map((row) => {
            const y = row === 0 ? 20 : 22 + 24 + 4 + BAR_H + 4;
            const offset = row === 0 ? -34 : 0;
            return (
              <g key={row}>
                {Array.from({ length: 11 }, (_, i) => (
                  <rect
                    key={i}
                    x={offset + i * 68}
                    y={y}
                    width={64}
                    height={24}
                    rx={2}
                    fill={i % 3 === 1 ? "#A8503A" : "#B0563B"}
                    stroke="#8F4530"
                  />
                ))}
              </g>
            );
          })}

          {/* The middle course: solid wall to the right, the gap on the left. */}
          <g transform={`translate(0 ${22 + 28})`}>
            {Array.from({ length: Math.ceil((BAR_W - gapWidth) / 68) + 1 }, (_, i) => {
              const w = Math.min(64, BAR_W - (gapWidth + 4 + i * 68));
              if (w <= 0) return null;
              return (
                <rect
                  key={i}
                  x={gapWidth + 4 + i * 68}
                  y={0}
                  width={w}
                  height={BAR_H}
                  rx={2}
                  fill={i % 2 === 0 ? "#B0563B" : "#A8503A"}
                  stroke="#8F4530"
                />
              );
            })}
            {/* The gap itself: dark, empty, chalk-marked. */}
            <rect x={0} y={0} width={gapWidth} height={BAR_H} rx={3} fill="#2E2621" stroke="#F5EFE4" strokeDasharray="6 5" strokeOpacity={0.7} />
            {/* Pieces laid into the gap: fresh bricks; past the chalk line they jut wrong. */}
            {Array.from({ length: laid }, (_, i) => {
              const over = i * pieceWidth + pieceWidth > gapWidth + 0.001;
              return (
                <g key={i}>
                  <rect
                    x={i * pieceWidth + 1}
                    y={2}
                    width={pieceWidth - 2}
                    height={BAR_H - 4}
                    rx={2}
                    fill={over ? "#7A4A3E" : "#C97856"}
                    stroke={over ? "#5E3A32" : "#9C5A3E"}
                  />
                  <rect
                    x={i * pieceWidth + 3}
                    y={4}
                    width={Math.max(0, pieceWidth - 6)}
                    height={5}
                    rx={2}
                    fill="#DE9270"
                    opacity={over ? 0.3 : 0.8}
                  />
                </g>
              );
            })}
            {/* The mason's chalk line marking exactly where the gap ends. */}
            <line x1={gapWidth} y1={-8} x2={gapWidth} y2={BAR_H + 8} stroke="#F5EFE4" strokeWidth={2.5} />
          </g>

          {/* The brick you are cutting from. */}
          <text x={0} y={22 + 28 + BAR_H + 40 + 24} className={styles.cap}>
            Your brick, cut into {denom}
          </text>
          <g transform={`translate(0 ${22 + 28 + BAR_H + 40 + 32})`}>
            <rect x={0} y={0} width={BAR_W} height={BAR_H} rx={4} fill="#C97856" stroke="#9C5A3E" />
            <rect x={3} y={3} width={BAR_W - 6} height={7} rx={3} fill="#DE9270" opacity={0.8} />
            {Array.from({ length: denom - 1 }, (_, i) => (
              <line
                key={i}
                x1={(i + 1) * pieceWidth}
                y1={0}
                x2={(i + 1) * pieceWidth}
                y2={BAR_H}
                stroke="#6E3F2E"
                strokeWidth={1.5}
              />
            ))}
          </g>

          <rect
            x={0}
            y={0}
            width={BAR_W}
            height={22 + 28 + BAR_H + 20}
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
