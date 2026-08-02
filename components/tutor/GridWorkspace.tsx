"use client";

import { useCallback, useMemo, useState } from "react";
import { systemRng } from "@/lib/math/rng";
import type { TopicRuntime } from "@/lib/math/registry";
import { GridTry, GridWatch } from "./GridModes";
import { AreaModel, SharePicture } from "./GridPictures";
import styles from "./StepsWorkspace.module.css";

/** Holds one column-arithmetic problem across Watch it and You try. */
export function GridWorkspace({
  runtime,
  level,
  mode,
  forcedProblem,
  onNewProblem,
}: {
  runtime: TopicRuntime;
  level: number;
  mode: "picture" | "watch" | "try";
  /** Set by "use your own numbers" or Practice's "walk me through it". */
  forcedProblem?: unknown;
  onNewProblem?: () => void;
}) {
  const [problem, setProblem] = useState(() => forcedProblem ?? runtime.gen(level, systemRng));
  const [stats, setStats] = useState({ solved: 0, clean: 0 });
  const [nonce, setNonce] = useState(0);

  const model = useMemo(() => runtime.gridBuild!(problem), [runtime, problem]);

  const newProblem = useCallback(() => {
    setProblem(runtime.gen(level, systemRng));
    setNonce((n) => n + 1);
    onNewProblem?.();
  }, [runtime, level, onNewProblem]);

  /** Same problem, cleared — You try's "Clear". */
  const restart = useCallback(() => setNonce((n) => n + 1), []);

  const onSolved = useCallback((clean: boolean) => {
    setStats((s) => ({ solved: s.solved + 1, clean: s.clean + (clean ? 1 : 0) }));
  }, []);

  return (
    <div>
      <div className={styles.head}>
        <p className={styles.title}>{model.title}</p>
        <div className={styles.headBtns}>
          {mode === "try" ? (
            <button type="button" className="btn ghost sm" onClick={restart}>
              Clear
            </button>
          ) : null}
          <button type="button" className="btn sm" onClick={newProblem}>
            {mode === "try" ? "Another one" : "New problem"}
          </button>
        </div>
      </div>

      {mode === "picture" ? (
        runtime.id === "mul" ? (
          <AreaModel
            key={nonce}
            a={(problem as { a: number }).a}
            b={(problem as { b: number }).b}
          />
        ) : model.kind === "div" ? (
          <SharePicture
            key={nonce}
            dividend={model.dividend}
            divisor={model.divisor}
            quotient={Number(model.answerText.split(" r")[0].replace(/,/g, ""))}
            remainder={model.remainder}
            chunkSteps={model.divSteps
              .filter((s) => s.quotient !== 0)
              .map((s) => {
                const chunk = s.quotient * Math.pow(10, model.dividendDigits.length - 1 - s.col);
                return { chunk, amount: chunk * model.divisor };
              })}
          />
        ) : null
      ) : mode === "watch" ? (
        <GridWatch key={nonce} model={model} />
      ) : (
        <GridTry key={nonce} model={model} onSolved={onSolved} />
      )}

      {mode === "try" && stats.solved > 0 ? (
        <div className={styles.stats}>
          <span className={styles.pill}>{stats.solved} solved</span>
          <span className={styles.pill}>{stats.clean} without help</span>
        </div>
      ) : null}
    </div>
  );
}
