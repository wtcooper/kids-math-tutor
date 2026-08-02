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
  allEasy,
  allSolved,
  type Cuts,
  genTiles,
  isEasy,
  regionsFor,
  sumText,
  tensCut,
} from "./tiles-model";
import styles from "./Tiles.module.css";

/**
 * Tiles — you cannot fill a piece without working out its area.
 *
 * Cut the rectangle, then claim each piece by saying how big it is. What you claim is
 * what appears, so a wrong area is the wrong size on screen rather than a cross.
 */

const HOW_TO: HowTo = {
  goal: "Cut the rectangle into pieces, then work out the area of every piece.",
  controls: [
    "Slide the two cutters to choose where the rectangle splits.",
    "Type each piece's area into the box on it.",
  ],
  rules: [
    "Any cut works — but cutting at the ten makes every piece one you already know.",
    "A wrong area fills the piece to the wrong size, so you can see it is off.",
    "The pieces added together are the answer to the whole multiplication.",
    "Nothing is timed and a wrong answer costs nothing.",
  ],
};

const MAX_W = 560;
const MAX_H = 300;

export default function Tiles({
  slug,
  topicId,
  name,
  concept,
  levels,
  initialLevel,
  seed,
}: GameProps) {
  const [level, setLevel] = useState(initialLevel);
  const [nonce, setNonce] = useState(0);
  const recorder = useAttemptRecorder({ gameSlug: slug, level });

  const problem = useMemo(() => {
    const rng = makeRng(mulberry32(seed + nonce * 7919 + level * 101));
    return genTiles(level, (a, b) => rng.int(a, b));
  }, [level, nonce, seed]);

  const [cuts, setCuts] = useState<Cuts>({ x: 0, y: 0 });
  const [claims, setClaims] = useState<(number | null)[]>([]);
  const [drafts, setDrafts] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [key, setKey] = useState(0);

  if (key !== nonce) {
    setKey(nonce);
    setCuts({ x: 0, y: 0 });
    setClaims([]);
    setDrafts([]);
    setDone(false);
  }

  const regions = regionsFor(problem, cuts);
  const cutBoth = cuts.x > 0 && cuts.x < problem.a && cuts.y > 0 && cuts.y < problem.b;

  const setCut = useCallback((axis: "x" | "y", value: number) => {
    // Moving a cut changes what every piece is, so the claims cannot survive it.
    setCuts((prev) => ({ ...prev, [axis]: value }));
    setClaims([]);
    setDrafts([]);
  }, []);

  const claim = useCallback(
    (index: number, raw: string) => {
      const parsed = raw.trim() === "" ? null : Number(raw);
      setClaims((prev) => {
        const next = [...prev];
        next[index] = Number.isFinite(parsed) ? (parsed as number) : null;
        if (cutBoth && allSolved(regions, next)) {
          recorder.record({
            type: "attempt",
            prompt: { a: problem.a, b: problem.b, cutX: cuts.x, cutY: cuts.y },
            response: { claims: next, easy: allEasy(regions), ok: true },
            elapsedMs: 0,
          });
          void recorder.flush();
          setDone(true);
        }
        return next;
      });
    },
    [regions, cutBoth, problem, cuts, recorder],
  );

  const newProblem = useCallback(() => setNonce((n) => n + 1), []);
  const changeLevel = useCallback((next: number) => {
    setLevel(next);
    setNonce((n) => n + 1);
  }, []);

  const scale = Math.min(MAX_W / problem.a, MAX_H / problem.b);
  const claimedTotal = regions.reduce((n, r) => n + (claims[r.index] ?? 0), 0);
  const solvedCount = regions.filter((r) => claims[r.index] === r.area).length;
  const nextUnsolved = regions.find((r) => claims[r.index] !== r.area);

  const workings: Workings = useMemo(() => {
    if (!cutBoth) {
      return {
        now: `Slide both cutters to break the ${problem.a} × ${problem.b} rectangle into four pieces.`,
        listTitle: "Why cut at the ten",
        lines: [
          { text: `${problem.a} = ${Math.floor(problem.a / 10) * 10} + ${problem.a % 10}`, state: "current" },
          { text: `${problem.b} = ${Math.floor(problem.b / 10) * 10} + ${problem.b % 10}`, state: "current" },
        ],
        hint: "Cutting at the ten leaves every piece with a whole ten or a single digit on its sides — and those are multiplications you already know.",
      };
    }
    if (!nextUnsolved) {
      return { now: "Every piece worked out.", lines: [] };
    }
    return {
      now: `How many squares in the ${nextUnsolved.w} by ${nextUnsolved.h} piece? That is ${nextUnsolved.w} × ${nextUnsolved.h}.`,
      listTitle: "The pieces",
      lines: regions.map((r) => ({
        text:
          claims[r.index] === r.area
            ? `${r.w} × ${r.h} = ${r.area}`
            : `${r.w} × ${r.h} = ?`,
        state:
          claims[r.index] === r.area
            ? ("done" as const)
            : r.index === nextUnsolved.index
              ? ("current" as const)
              : ("todo" as const),
      })),
      hint:
        isEasy(nextUnsolved.w) && isEasy(nextUnsolved.h)
          ? `${nextUnsolved.w} × ${nextUnsolved.h}: multiply the digits and put the zeros back on the end.`
          : `${nextUnsolved.w} × ${nextUnsolved.h} is awkward. Try moving a cutter to a whole ten — the pieces get much easier.`,
    };
  }, [cutBoth, nextUnsolved, regions, claims, problem]);

  return (
    <GameChrome
      slug={slug}
      concept={concept}
      title={name}
      topicId={topicId}
      levels={levels}
      level={level}
      onLevel={changeLevel}
      instructions="Slide the cutters, then work out the area of each piece and type it in."
      howTo={HOW_TO}
      workings={workings}
      workingsKey={`${level}-${nonce}-${cuts.x}-${cuts.y}`}
      status={
        <>
          <span className={styles.pip}>
            {problem.a} × {problem.b}
          </span>
          <span className={styles.soft}>
            {cutBoth ? `${solvedCount} of ${regions.length} pieces worked out` : "cut it up first"}
          </span>
          <button
            type="button"
            className={styles.mini}
            onClick={() => {
              setCuts(tensCut(problem));
              setClaims([]);
              setDrafts([]);
            }}
            disabled={done}
          >
            Cut at the tens
          </button>
        </>
      }
    >
      <div className={styles.stage}>
        <div className={styles.cutRow}>
          <label className={styles.cutLabel}>
            <span className={styles.cutText}>
              Across: {cuts.x} + {problem.a - cuts.x} = {problem.a}
            </span>
            <input
              type="range"
              min={0}
              max={problem.a}
              value={cuts.x}
              onChange={(e) => setCut("x", Number(e.target.value))}
              disabled={done}
              aria-label="Where to cut across the width"
            />
          </label>
          <label className={styles.cutLabel}>
            <span className={styles.cutText}>
              Down: {cuts.y} + {problem.b - cuts.y} = {problem.b}
            </span>
            <input
              type="range"
              min={0}
              max={problem.b}
              value={cuts.y}
              onChange={(e) => setCut("y", Number(e.target.value))}
              disabled={done}
              aria-label="Where to cut down the height"
            />
          </label>
        </div>

        <div
          className={styles.board}
          style={{ width: problem.a * scale, height: problem.b * scale }}
        >
          {regions.map((rg) => {
            const claimed = claims[rg.index];
            const right = claimed === rg.area;
            // The claim fills the piece: too small leaves a gap, too big overflows. Being
            // wrong is something she can see, not something she is told.
            const fill =
              claimed === null || claimed === undefined ? 0 : Math.min(1.35, claimed / rg.area);
            const easy = isEasy(rg.w) && isEasy(rg.h);
            return (
              <div
                key={rg.index}
                className={`${styles.region} ${right ? styles.right : ""}`}
                style={{
                  left: rg.c * scale,
                  top: rg.r * scale,
                  width: rg.w * scale,
                  height: rg.h * scale,
                }}
              >
                <div
                  className={`${styles.fill} ${fill > 1.001 ? styles.over : ""}`}
                  style={{ height: `${Math.min(100, fill * 100)}%` }}
                />
                <div className={styles.regionBody}>
                  <span className={styles.dims}>
                    {rg.w} × {rg.h}
                    {easy ? (
                      <span className={styles.easy} title="one you already know">
                        ★
                      </span>
                    ) : null}
                  </span>
                  <input
                    className={`${styles.claim} ${right ? styles.claimOk : ""}`}
                    inputMode="numeric"
                    value={drafts[rg.index] ?? ""}
                    placeholder="?"
                    disabled={done}
                    aria-label={`Area of the ${rg.w} by ${rg.h} piece`}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d]/g, "").slice(0, 5);
                      setDrafts((prev) => {
                        const next = [...prev];
                        next[rg.index] = v;
                        return next;
                      });
                      claim(rg.index, v);
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {cutBoth ? (
          <p className={styles.running}>
            {regions.map((r, i) => (
              <span key={r.index}>
                {i > 0 ? <span className={styles.plus}> + </span> : null}
                <span className={claims[r.index] === r.area ? styles.good : styles.unknown}>
                  {claims[r.index] ?? "?"}
                </span>
              </span>
            ))}
            <span className={styles.plus}> = </span>
            <span className={styles.runTotal}>{claimedTotal || "?"}</span>
          </p>
        ) : (
          <p className={styles.hintLine}>
            Two cuts make four pieces. Cutting at a whole ten is what makes each piece easy.
          </p>
        )}

        {done ? (
          <div className={styles.overlay}>
            <div className={`card ${styles.panel}`}>
              <h2 className={styles.h2}>Every piece worked out.</h2>
              <div className={styles.work}>
                <div className={styles.line}>
                  <span className={styles.mono}>
                    ({cuts.x} + {problem.a - cuts.x}) × ({cuts.y} + {problem.b - cuts.y})
                  </span>
                </div>
                <div className={styles.parts}>
                  {regions.map((r) => (
                    <span key={r.index} className={styles.part}>
                      {r.w} × {r.h} = {r.area}
                    </span>
                  ))}
                </div>
                <div className={styles.total}>
                  {sumText(regions)} = <strong>{problem.a * problem.b}</strong>
                </div>
              </div>
              <p className={styles.foot}>
                {allEasy(regions)
                  ? "Every piece had a whole ten or a single digit on its sides — that is why cutting at the ten is the one to reach for."
                  : "That cut works, and it gave the right answer. Try “Cut at the tens” next time and see how much easier the four multiplications get."}
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
      </div>
    </GameChrome>
  );
}
