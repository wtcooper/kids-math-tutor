"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { GameChrome } from "@/components/game/GameChrome";
import { useAttemptRecorder } from "@/components/game/useAttemptRecorder";
import type { HowTo } from "@/components/game/HowToPlay";
import { makeRng, mulberry32 } from "@/lib/math/rng";
import { tutorHref } from "@/lib/topics";
import type { GameProps } from "../../GameHost";
import {
  apply,
  canApply,
  equationText,
  genBalance,
  isSolved,
  type Move,
  type Scale,
  type Side,
  solvedValue,
} from "./balance-model";
import styles from "./Balance.module.css";

const HOW_TO: HowTo = {
  goal: "Get one bag alone on a pan. Whatever balances it is what is inside.",
  controls: [
    "Every button does the same thing to BOTH pans — that is the only rule.",
    "Take stones off, take bags off, or split everything into equal groups.",
  ],
  rules: [
    "Every bag holds the same number of stones. Nobody knows how many yet.",
    "The scale stays level because you always did the same thing to both sides.",
    "A move that would need more than a pan has is refused — nothing breaks.",
    "The written equation beside the scale is the same move in numbers.",
  ],
};

function Pan({ side, label }: { side: Side; label: string }) {
  return (
    <div className={styles.pan}>
      <div className={styles.panItems}>
        {Array.from({ length: side.bags }, (_, i) => (
          <span key={`b${i}`} className={styles.bag} title="a bag">
            x
          </span>
        ))}
        {Array.from({ length: side.stones }, (_, i) => (
          <span key={`s${i}`} className={styles.stone} />
        ))}
        {side.bags === 0 && side.stones === 0 ? (
          <span className={styles.empty}>empty</span>
        ) : null}
      </div>
      <div className={styles.panLabel}>{label}</div>
    </div>
  );
}

export default function Balance({ slug, topicId, name, concept, levels, initialLevel, seed }: GameProps) {
  const [level, setLevel] = useState(initialLevel);
  const [nonce, setNonce] = useState(0);
  const recorder = useAttemptRecorder({ gameSlug: slug, level });

  const problem = useMemo(() => {
    const rng = makeRng(mulberry32(seed + nonce * 7919 + level * 977));
    return genBalance(level, (a, b) => rng.int(a, b));
  }, [level, nonce, seed]);

  const [scale, setScale] = useState<Scale>(problem.start);
  const [history, setHistory] = useState<string[]>([equationText(problem.start)]);
  const [moves, setMoves] = useState(0);
  const [refused, setRefused] = useState<string | null>(null);
  const [problemKey, setProblemKey] = useState(0);

  // Reset when the problem changes, without an effect: a key comparison is enough and
  // avoids a render with the old scale against the new problem.
  if (problemKey !== nonce) {
    setProblemKey(nonce);
    setScale(problem.start);
    setHistory([equationText(problem.start)]);
    setMoves(0);
    setRefused(null);
  }

  const solved = isSolved(scale);
  const answer = solvedValue(scale);

  const doMove = useCallback(
    (move: Move, why: string) => {
      if (solved) return;
      if (!canApply(scale, move)) {
        setRefused(why);
        return;
      }
      setRefused(null);
      const next = apply(scale, move);
      setScale(next);
      setHistory((h) => [...h, equationText(next)]);
      setMoves((m) => m + 1);
      if (isSolved(next)) {
        recorder.record({
          type: "attempt",
          prompt: { equation: equationText(problem.start), x: problem.x },
          response: { moves: moves + 1, answer: solvedValue(next), ok: solvedValue(next) === problem.x },
          elapsedMs: 0,
        });
        void recorder.flush();
      }
    },
    [scale, solved, moves, problem, recorder],
  );

  const restart = useCallback(() => {
    setScale(problem.start);
    setHistory([equationText(problem.start)]);
    setMoves(0);
    setRefused(null);
  }, [problem]);

  const newProblem = useCallback(() => setNonce((n) => n + 1), []);
  const changeLevel = useCallback((next: number) => {
    setLevel(next);
    setNonce((n) => n + 1);
  }, []);

  const minStones = Math.min(scale.left.stones, scale.right.stones);
  const minBags = Math.min(scale.left.bags, scale.right.bags);
  const divisors = [2, 3, 4, 5].filter((by) => canApply(scale, { kind: "divide", by }));

  return (
    <GameChrome
      slug={slug}
      concept={concept}
      title={name}
      topicId={topicId}
      levels={levels}
      level={level}
      onLevel={changeLevel}
      instructions="Do the same thing to both pans until one bag stands alone."
      howTo={HOW_TO}
      status={
        <>
          <span className={styles.pip}>{equationText(scale)}</span>
          <span className={styles.soft}>
            {moves} move{moves === 1 ? "" : "s"}
          </span>
          <button type="button" className={styles.mini} onClick={restart}>
            Put it back
          </button>
        </>
      }
    >
      <div className={styles.stage}>
        <div className={styles.scaleWrap}>
          <Pan side={scale.left} label="left pan" />
          <div className={styles.pivot}>
            <span className={styles.equals}>=</span>
          </div>
          <Pan side={scale.right} label="right pan" />
        </div>

        <div className={styles.controls}>
          <span className={styles.label}>Do this to both pans</span>
          {/*
            Disabled rather than merely refused. The refusal message teaches, but a button
            that cannot possibly work in this state just invites flailing — at 2x = 16
            there are no stones to remove and the only move left is to share both sides
            out, which is easy to miss while tapping a dead button.
          */}
          <button
            type="button"
            className={styles.move}
            onClick={() =>
              doMove({ kind: "removeStones", count: 1 }, "One pan has no stone left to take.")
            }
            disabled={solved || !canApply(scale, { kind: "removeStones", count: 1 })}
          >
            Take 1 stone off each
          </button>
          {minStones > 1 ? (
            <button
              type="button"
              className={styles.move}
              onClick={() =>
                doMove({ kind: "removeStones", count: minStones }, "Not enough stones.")
              }
              disabled={solved}
            >
              Take {minStones} off each
            </button>
          ) : null}
          {minBags > 0 ? (
            <button
              type="button"
              className={styles.move}
              onClick={() => doMove({ kind: "removeBag", count: 1 }, "One pan has no bag to take.")}
              disabled={solved}
            >
              Take 1 bag off each
            </button>
          ) : null}
          {divisors.map((by) => (
            <button
              key={by}
              type="button"
              className={styles.move}
              onClick={() => doMove({ kind: "divide", by }, `Cannot share into ${by} equal groups.`)}
              disabled={solved}
            >
              Split both into {by}
            </button>
          ))}
        </div>

        {refused ? <p className={styles.refused}>{refused}</p> : null}

        <div className={styles.workings}>
          <span className={styles.label}>What you did, in numbers</span>
          <ol className={styles.steps}>
            {history.map((line, i) => (
              <li key={i} className={i === history.length - 1 ? styles.now : undefined}>
                {line}
              </li>
            ))}
          </ol>
        </div>

        {solved ? (
          <div className={styles.overlay}>
            <div className={`card ${styles.panel}`}>
              <h2 className={styles.h2}>
                x = {answer}
              </h2>
              <p className={styles.sub}>
                One bag on its own, balanced by {answer} stone{answer === 1 ? "" : "s"}. So that
                is what was in every bag all along.
              </p>
              <ol className={styles.recap}>
                {history.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
              <p className={styles.note}>
                Solved in {moves} move{moves === 1 ? "" : "s"}, and the scale never tipped —
                because every move was done to both sides.
              </p>
              <div className={styles.actions}>
                <button type="button" className="btn primary" onClick={newProblem}>
                  Another scale
                </button>
                <Link className="btn" href={tutorHref(topicId, { level })}>
                  See this in the tutor
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </GameChrome>
  );
}
