"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { systemRng } from "@/lib/math/rng";
import type { TopicRuntime } from "@/lib/math/registry";
import styles from "./PracticeMode.module.css";

/**
 * Practice, ported from docs/math-table.html:3219-3282.
 *
 * "Walk me through it" is the important one: it hands the *current* problem to Watch it
 * rather than generating a fresh one, so the escape hatch actually explains the thing she
 * is stuck on.
 *
 * There is no timer anywhere, and a wrong answer costs nothing but the streak — it shows
 * the topic's hint and lets her try again.
 */

const PRAISE = [
  "Yes! That is it.",
  "Correct — nice work.",
  "Exactly right.",
  "Got it.",
  "That is the one.",
];

export function PracticeMode({
  runtime,
  level,
  onWalkThrough,
}: {
  runtime: TopicRuntime;
  level: number;
  /** Hands this exact problem to Watch it. */
  onWalkThrough?: (problem: unknown) => void;
}) {
  const [problem, setProblem] = useState(() => runtime.gen(level, systemRng));
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<"asking" | "right" | "wrong">("asking");
  const [answered, setAnswered] = useState(false);
  const [praise, setPraise] = useState(PRAISE[0]);
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0, best: 0 });
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProblem(runtime.gen(level, systemRng));
    setValues({});
    setState("asking");
    setAnswered(false);
  }, [runtime, level]);

  const next = useCallback(() => {
    setProblem(runtime.gen(level, systemRng));
    setValues({});
    setState("asking");
    setAnswered(false);
    requestAnimationFrame(() => firstRef.current?.focus());
  }, [runtime, level]);

  const check = useCallback(() => {
    if (answered) {
      next();
      return;
    }
    const anyTyped = runtime.fields.some((f) => (values[f.key] ?? "").trim() !== "");
    if (!anyTyped) return;

    const ok = runtime.check(problem, values);
    setScore((s) => ({ ...s, total: s.total + 1 }));

    if (ok) {
      setScore((s) => {
        const streak = s.streak + 1;
        return { right: s.right + 1, total: s.total, streak, best: Math.max(s.best, streak) };
      });
      setPraise(PRAISE[systemRng.int(0, PRAISE.length - 1)]);
      setState("right");
      setAnswered(true);
    } else {
      setScore((s) => ({ ...s, streak: 0 }));
      setState("wrong");
    }
  }, [answered, runtime, problem, values, next]);

  const prompt = runtime.title(problem);
  // Long or wordy prompts read better as a sentence than as a big monospace sum.
  const isWord = prompt.length > 34 || /[a-z]{4}/.test(prompt.replace(/^[A-Z]/, ""));
  const hint = useMemo(() => runtime.hint?.(problem), [runtime, problem]);
  const accuracy = score.total ? `${Math.round((score.right / score.total) * 100)}%` : "—";

  return (
    <div>
      <div className={styles.head}>
        <div>
          <h2 className={styles.headTitle}>Practice</h2>
          <p className={styles.headSub}>
            Type the answer and press Enter. Stuck? Walk it through together.
          </p>
        </div>
        <div className={styles.btnRow}>
          {onWalkThrough ? (
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => onWalkThrough(problem)}
            >
              Walk me through it
            </button>
          ) : null}
          <button type="button" className="btn sm" onClick={next}>
            Skip
          </button>
        </div>
      </div>

      <div className={isWord ? styles.probtext : styles.bigprob}>{prompt}</div>

      <form
        className={styles.answerrow}
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        {runtime.fields.map((f, i) => (
          <div key={f.key}>
            <div className={styles.alabel}>{f.label}</div>
            <input
              ref={i === 0 ? firstRef : undefined}
              className={`${styles.abox} ${f.size === "small" ? styles.small : ""} ${
                state === "right" ? styles.ok : state === "wrong" ? styles.bad : ""
              }`}
              value={values[f.key] ?? ""}
              placeholder={f.placeholder}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              onFocus={(e) => e.target.select()}
              inputMode="text"
              autoComplete="off"
              disabled={answered}
            />
          </div>
        ))}
        <button type="submit" className="btn primary" style={{ height: "3.4rem", padding: "0 1.5rem" }}>
          {answered ? "Next problem →" : "Check"}
        </button>
      </form>

      {state === "right" ? (
        <p className={`${styles.feedback} ${styles.good}`}>
          {praise} Press Enter for the next one.
        </p>
      ) : null}
      {state === "wrong" ? (
        <p className={`${styles.feedback} ${styles.try}`}>Not yet. {hint}</p>
      ) : null}

      <div className={styles.scorebar}>
        <span className={styles.pill}>
          Correct <b>{score.right}</b> / {score.total}
        </span>
        <span className={styles.pill}>
          Accuracy <b>{accuracy}</b>
        </span>
        <span className={`${styles.pill} ${styles.streak}`}>
          Streak <b>{score.streak}</b>
          {score.best > score.streak ? ` · best ${score.best}` : ""}
        </span>
      </div>
    </div>
  );
}
