"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { systemRng } from "@/lib/math/rng";
import type { TopicRuntime } from "@/lib/math/registry";
import styles from "./PracticeMode.module.css";

/**
 * Practice: a plain generator with a streak counter and a way out.
 *
 * No timer of any kind. The streak counts up and never punishes — a wrong answer shows
 * the working and moves on, because "you broke your streak" is the exact pressure the
 * design is trying to remove.
 */
export function PracticeMode({
  runtime,
  level,
}: {
  runtime: TopicRuntime;
  level: number;
}) {
  const [problem, setProblem] = useState(() => runtime.gen(level, systemRng));
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<"asking" | "right" | "shown">("asking");
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [right, setRight] = useState(0);
  const [total, setTotal] = useState(0);
  const firstRef = useRef<HTMLInputElement>(null);

  const next = useCallback(() => {
    setProblem(runtime.gen(level, systemRng));
    setValues({});
    setState("asking");
    requestAnimationFrame(() => firstRef.current?.focus());
  }, [runtime, level]);

  const submit = useCallback(() => {
    if (state !== "asking") {
      next();
      return;
    }
    const ok = runtime.check(problem, values);
    setTotal((n) => n + 1);
    if (ok) {
      setRight((n) => n + 1);
      setStreak((s) => {
        const v = s + 1;
        setBest((b) => Math.max(b, v));
        return v;
      });
      setState("right");
    } else {
      setStreak(0);
      setState("shown");
    }
  }, [state, runtime, problem, values, next]);

  const hint = useMemo(() => runtime.hint?.(problem), [runtime, problem]);

  return (
    <div className={styles.wrap}>
      <p className={styles.prompt}>{runtime.title(problem)}</p>

      <form
        className={styles.row}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {runtime.fields.map((f, i) => (
          <label key={f.key} className={styles.field}>
            <span className={styles.label}>{f.label}</span>
            <input
              ref={i === 0 ? firstRef : undefined}
              className={`${styles.box} ${f.size === "small" ? styles.small : ""} ${
                state === "right" ? styles.ok : state === "shown" ? styles.bad : ""
              }`}
              value={values[f.key] ?? ""}
              placeholder={f.placeholder}
              onChange={(e) =>
                setValues((v) => ({ ...v, [f.key]: e.target.value }))
              }
              inputMode="text"
              autoComplete="off"
              disabled={state !== "asking"}
            />
          </label>
        ))}
        <button type="submit" className="btn primary">
          {state === "asking" ? "Check" : "Next"}
        </button>
        {state === "asking" ? (
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => {
              setStreak(0);
              setTotal((n) => n + 1);
              setState("shown");
            }}
          >
            Show me
          </button>
        ) : null}
      </form>

      {state === "right" ? (
        <p className={`${styles.feedback} ${styles.good}`}>That is right.</p>
      ) : null}
      {state === "shown" ? (
        <p className={`${styles.feedback} ${styles.try}`}>
          The answer is <strong>{runtime.answer(problem)}</strong>.
        </p>
      ) : null}
      {state === "asking" && hint ? <p className={styles.hint}>{hint}</p> : null}

      <div className={styles.score}>
        <span className={styles.pill}>
          {right} of {total} right
        </span>
        <span className={`${styles.pill} ${streak > 0 ? styles.streak : ""}`}>
          streak {streak}
        </span>
        {best > 0 ? <span className={styles.pill}>best {best}</span> : null}
      </div>
    </div>
  );
}
