"use client";

import { useCallback, useState } from "react";
import styles from "./CustomNumbers.module.css";

/**
 * "or use your own" — the box that lets her work from her actual homework.
 *
 * In the original this silently did nothing for a while: the Set button lives outside
 * the stage, but was looked up with a stage-scoped querySelector, so the handler bound to
 * null on every render (BUILD-NOTES issue 7). Typing 57 and 75 kept whatever random
 * problem was already there. Nothing structural here can reproduce that, but it is the
 * reason this component exists as its own thing rather than as markup inside a renderer.
 */

export interface CustomSpec {
  op: string;
  validate(a: number, b: number): string | null;
  apply(a: number, b: number): unknown;
}

export function CustomNumbers({
  spec,
  onSet,
}: {
  spec: CustomSpec;
  onSet: (problem: unknown) => void;
}) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(() => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!na || !nb) {
      setError("Enter two whole numbers.");
      return;
    }
    const err = spec.validate(na, nb);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onSet(spec.apply(na, nb));
  }, [a, b, spec, onSet]);

  return (
    <div className={styles.wrap}>
      <form
        className={styles.row}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <span className={styles.label}>or use your own:</span>
        <input
          className={styles.box}
          value={a}
          onChange={(e) => setA(e.target.value)}
          inputMode="numeric"
          aria-label="first number"
        />
        <span className={styles.op}>{spec.op}</span>
        <input
          className={styles.box}
          value={b}
          onChange={(e) => setB(e.target.value)}
          inputMode="numeric"
          aria-label="second number"
        />
        {/* Enter in either box submits, as it did originally. */}
        <button type="submit" className="btn sm">
          Set
        </button>
      </form>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
