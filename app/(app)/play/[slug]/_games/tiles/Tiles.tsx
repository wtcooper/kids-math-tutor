"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GameChrome } from "@/components/game/GameChrome";
import { useAttemptRecorder } from "@/components/game/useAttemptRecorder";
import type { HowTo } from "@/components/game/HowToPlay";
import { makeRng, mulberry32 } from "@/lib/math/rng";
import { tutorHref } from "@/lib/topics";
import type { GameProps } from "../../GameHost";
import {
  canPlace,
  coveredCells,
  decompose,
  genTiles,
  type Placed,
  type TileKind,
  TILE_SIZE,
  tileAt,
  tally,
} from "./tiles-model";
import styles from "./Tiles.module.css";

/**
 * Tiles — partial products as objects you can pick up.
 *
 * Cover an a × b rectangle with hundred-squares, ten-strips and unit squares. The pile
 * you end up using *is* the four partial products, and the round-end panel rewrites your
 * own tiles as (20 + 3) × (10 + 4) = 200 + 80 + 30 + 12 — the same decomposition the
 * tutor's area model shows for the same problem.
 *
 * No timer, no failure state. A tile that will not fit simply does not go down.
 */

const HOW_TO: HowTo = {
  goal: "Cover the whole rectangle with tiles, leaving no gaps.",
  controls: [
    "Pick a tile from the tray, then tap the rectangle to drop it.",
    "Tap a tile you have already placed to take it back.",
  ],
  rules: [
    "Big squares are 100, strips are 10, little squares are 1.",
    "Tiles cannot overlap or hang over the edge — one that will not fit just will not go down.",
    "When it is covered, the tiles you used are the parts of the answer.",
    "Nothing is timed, and you can lift any tile back off.",
  ],
};

const TRAY: { kind: TileKind; label: string }[] = [
  { kind: "hundred", label: "100" },
  { kind: "tenAcross", label: "10 across" },
  { kind: "tenDown", label: "10 down" },
  { kind: "one", label: "1" },
];

const FILL: Record<TileKind, string> = {
  hundred: "#dCe7d6",
  tenAcross: "#f0dcc8",
  tenDown: "#e8dbef",
  one: "#f7e6c8",
};
const STROKE: Record<TileKind, string> = {
  hundred: "#8aa683",
  tenAcross: "#c99a6f",
  tenDown: "#a98cb8",
  one: "#d2b483",
};

export default function Tiles({ slug, topicId, name, concept, levels, initialLevel, seed }: GameProps) {
  const [level, setLevel] = useState(initialLevel);
  const [nonce, setNonce] = useState(0);
  const recorder = useAttemptRecorder({ gameSlug: slug, level });

  const problem = useMemo(() => {
    const rng = makeRng(mulberry32(seed + nonce * 7919 + level * 101));
    return genTiles(level, (a, b) => rng.int(a, b));
  }, [level, nonce, seed]);

  const [placed, setPlaced] = useState<Placed[]>([]);
  const [pick, setPick] = useState<TileKind>("hundred");
  const [nextId, setNextId] = useState(1);
  const [done, setDone] = useState(false);

  const dec = useMemo(() => decompose(problem), [problem]);
  const covered = coveredCells(placed);
  const total = problem.a * problem.b;

  // The rectangle is drawn to fit the stage rather than at a fixed cell size, so a 39×19
  // board and an 11×3 one both fill the space.
  const cell = Math.max(9, Math.min(30, Math.floor(620 / problem.a), Math.floor(330 / problem.b)));
  const boardW = problem.a * cell;
  const boardH = problem.b * cell;

  const reset = useCallback(() => {
    setPlaced([]);
    setNextId(1);
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

  const onBoard = useCallback(
    (evt: React.MouseEvent<SVGSVGElement>) => {
      if (done) return;
      const rect = evt.currentTarget.getBoundingClientRect();
      const c = Math.floor(((evt.clientX - rect.left) / rect.width) * problem.a);
      const r = Math.floor(((evt.clientY - rect.top) / rect.height) * problem.b);
      if (c < 0 || r < 0 || c >= problem.a || r >= problem.b) return;

      /*
       * Everything inside the updater, reading `prev` rather than the render's `placed`.
       * Tapping faster than React re-renders is completely normal — laying twelve unit
       * squares is twelve quick taps — and against a captured `placed` each one rebuilt
       * the array from a stale copy, so all but the last silently vanished.
       */
      setPlaced((prev) => {
        const existing = tileAt(prev, c, r);
        // Tapping a tile lifts it. No separate eraser mode to discover.
        if (existing) return prev.filter((p) => p.id !== existing.id);
        if (!canPlace(prev, pick, c, r, problem)) return prev;
        setNextId((n) => n + 1);
        return [...prev, { id: nextId + prev.length, kind: pick, c, r }];
      });
    },
    [done, pick, problem, nextId],
  );

  // Completion is derived from the board rather than decided at the moment of the tap,
  // which keeps it correct however the tiles got there.
  useEffect(() => {
    if (done || placed.length === 0) return;
    if (coveredCells(placed) !== total) return;
    recorder.record({
      type: "attempt",
      prompt: { a: problem.a, b: problem.b },
      response: { ...tally(placed), pieces: placed.length, fewest: dec.fewest },
      elapsedMs: 0,
    });
    void recorder.flush();
    setDone(true);
  }, [placed, done, total, problem, dec.fewest, recorder]);

  const t = tally(placed);

  return (
    <GameChrome
      slug={slug}
      concept={concept}
      title={name}
      topicId={topicId}
      levels={levels}
      level={level}
      onLevel={changeLevel}
      instructions="Pick a tile, then tap the rectangle to lay it down. Cover the whole thing."
      howTo={HOW_TO}
      status={
        <>
          <span className={styles.pip}>
            {problem.a} × {problem.b}
          </span>
          <span className={styles.pip}>
            {covered} of {total} squares covered
          </span>
          <span className={styles.soft}>
            {placed.length} tile{placed.length === 1 ? "" : "s"} down
          </span>
          <button type="button" className={styles.mini} onClick={reset}>
            Clear the board
          </button>
        </>
      }
    >
      <div className={styles.stage}>
        <div className={styles.tray}>
          {TRAY.map((item) => (
            <button
              key={item.kind}
              type="button"
              className={`${styles.trayItem} ${pick === item.kind ? styles.on : ""}`}
              onClick={() => setPick(item.kind)}
            >
              <svg
                width={TILE_SIZE[item.kind].w * 5 + 2}
                height={TILE_SIZE[item.kind].h * 5 + 2}
                className={styles.swatch}
                aria-hidden
              >
                <rect
                  x={1}
                  y={1}
                  width={TILE_SIZE[item.kind].w * 5}
                  height={TILE_SIZE[item.kind].h * 5}
                  fill={FILL[item.kind]}
                  stroke={STROKE[item.kind]}
                />
              </svg>
              <span>{item.label}</span>
              <span className={styles.count}>{t[item.kind]}</span>
            </button>
          ))}
        </div>

        <svg
          className={styles.board}
          width={boardW}
          height={boardH}
          viewBox={`0 0 ${problem.a} ${problem.b}`}
          onClick={onBoard}
          role="img"
          aria-label={`Rectangle ${problem.a} wide and ${problem.b} tall`}
        >
          <rect x={0} y={0} width={problem.a} height={problem.b} fill="#fffcf7" />
          {/* Unit grid, so the size of every tile is readable against it. */}
          <g stroke="#eee2ce" strokeWidth={0.03}>
            {Array.from({ length: problem.a - 1 }, (_, i) => (
              <line key={`v${i}`} x1={i + 1} y1={0} x2={i + 1} y2={problem.b} />
            ))}
            {Array.from({ length: problem.b - 1 }, (_, i) => (
              <line key={`h${i}`} x1={0} y1={i + 1} x2={problem.a} y2={i + 1} />
            ))}
          </g>
          {placed.map((p) => (
            <rect
              key={p.id}
              x={p.c + 0.04}
              y={p.r + 0.04}
              width={TILE_SIZE[p.kind].w - 0.08}
              height={TILE_SIZE[p.kind].h - 0.08}
              rx={0.12}
              fill={FILL[p.kind]}
              stroke={STROKE[p.kind]}
              strokeWidth={0.06}
            />
          ))}
          <rect
            x={0.02}
            y={0.02}
            width={problem.a - 0.04}
            height={problem.b - 0.04}
            fill="none"
            stroke="#b9a88f"
            strokeWidth={0.08}
          />
        </svg>
      </div>

      {done ? (
        <div className={styles.overlay}>
          <div className={`card ${styles.panel}`}>
            <h2 className={styles.h2}>Covered.</h2>
            <p className={styles.sub}>The tiles you used are the parts of the answer.</p>

            <div className={styles.work}>
              <div className={styles.line}>
                <span className={styles.mono}>
                  ({dec.tensA} + {dec.onesA}) × ({dec.tensB} + {dec.onesB})
                </span>
              </div>
              <div className={styles.parts}>
                <span className={styles.part}>
                  {dec.tensA} × {dec.tensB} = {dec.tensA * dec.tensB}
                </span>
                <span className={styles.part}>
                  {dec.tensA} × {dec.onesB} = {dec.tensA * dec.onesB}
                </span>
                <span className={styles.part}>
                  {dec.onesA} × {dec.tensB} = {dec.onesA * dec.tensB}
                </span>
                <span className={styles.part}>
                  {dec.onesA} × {dec.onesB} = {dec.onesA * dec.onesB}
                </span>
              </div>
              <div className={styles.total}>
                {problem.a} × {problem.b} = <strong>{dec.product}</strong>
              </div>
            </div>

            <p className={styles.foot}>
              You laid {placed.length} tile{placed.length === 1 ? "" : "s"}
              {placed.length === dec.fewest
                ? " — the fewest this rectangle can be covered with."
                : ` · it can be done with ${dec.fewest}.`}
            </p>

            <div className={styles.actions}>
              <button type="button" className="btn primary" onClick={newProblem}>
                Another rectangle
              </button>
              <Link className="btn" href={tutorHref(topicId, { level, mode: "picture" })}>
                See this in the tutor
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </GameChrome>
  );
}
