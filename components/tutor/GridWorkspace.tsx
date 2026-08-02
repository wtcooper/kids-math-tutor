"use client";

import { useCallback, useMemo, useState } from "react";
import { systemRng } from "@/lib/math/rng";
import type { TopicRuntime } from "@/lib/math/registry";
import { GridTry, GridWatch } from "./GridModes";
import styles from "./StepsWorkspace.module.css";

/** Holds one column-arithmetic problem across Watch it and You try. */
export function GridWorkspace({
  runtime,
  level,
  mode,
}: {
  runtime: TopicRuntime;
  level: number;
  mode: "watch" | "try";
}) {
  const [problem, setProblem] = useState(() => runtime.gen(level, systemRng));
  const [stats, setStats] = useState({ solved: 0, clean: 0 });
  const [nonce, setNonce] = useState(0);

  const model = useMemo(() => runtime.gridBuild!(problem), [runtime, problem]);

  const newProblem = useCallback(() => {
    setProblem(runtime.gen(level, systemRng));
    setNonce((n) => n + 1);
  }, [runtime, level]);

  const onSolved = useCallback((clean: boolean) => {
    setStats((s) => ({ solved: s.solved + 1, clean: s.clean + (clean ? 1 : 0) }));
  }, []);

  return (
    <div>
      <div className={styles.head}>
        <p className={styles.title}>{model.title}</p>
        <button type="button" className="btn sm" onClick={newProblem}>
          New problem
        </button>
      </div>

      {mode === "watch" ? (
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
