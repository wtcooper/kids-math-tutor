"use client";

import { useCallback, useMemo, useState } from "react";
import { systemRng } from "@/lib/math/rng";
import type { TopicRuntime } from "@/lib/math/registry";
import { PictureIt, WatchIt, YouTry } from "./StepsModes";
import styles from "./StepsWorkspace.module.css";

/**
 * Holds the current problem across Picture it / Watch it / You try, and owns the
 * "New problem" button so the three modes stay in sync on one problem.
 *
 * Tracks clean vs helped solves the way the original header did — a run where she was
 * shown a step reads differently from one she earned.
 */
export function StepsWorkspace({
  runtime,
  level,
  mode,
}: {
  runtime: TopicRuntime;
  level: number;
  mode: "picture" | "watch" | "try";
}) {
  const [problem, setProblem] = useState(() => runtime.gen(level, systemRng));
  const [stats, setStats] = useState({ solved: 0, clean: 0 });
  const [nonce, setNonce] = useState(0);

  const model = useMemo(() => runtime.build!(problem), [runtime, problem]);

  const newProblem = useCallback(() => {
    setProblem(runtime.gen(level, systemRng));
    setNonce((n) => n + 1);
  }, [runtime, level]);

  const onSolved = useCallback((clean: boolean) => {
    setStats((s) => ({ solved: s.solved + 1, clean: s.clean + (clean ? 1 : 0) }));
  }, []);

  const hasPicture = Boolean(model.picture);

  return (
    <div>
      <div className={styles.head}>
        <p className={styles.title}>{model.title}</p>
        <button type="button" className="btn sm" onClick={newProblem}>
          New problem
        </button>
      </div>

      {mode === "picture" ? (
        hasPicture ? (
          <PictureIt model={model} />
        ) : (
          <p className={styles.noPicture}>
            This one has no picture — try <strong>Watch it</strong> to see the steps.
          </p>
        )
      ) : mode === "watch" ? (
        <WatchIt key={nonce} model={model} />
      ) : (
        <YouTry key={nonce} model={model} onSolved={onSolved} />
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
